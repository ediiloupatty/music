//go:build windows

package main

import (
	"syscall"
	"unsafe"
)

var (
	user32           = syscall.NewLazyDLL("user32.dll")
	pSetWindowPos    = user32.NewProc("SetWindowPos")
	pShowWindow      = user32.NewProc("ShowWindow")
	pReleaseCapture  = user32.NewProc("ReleaseCapture")
	pSendMessage     = user32.NewProc("SendMessageW")
	pGetWindowRect   = user32.NewProc("GetWindowRect")
	pMonitorFromWin  = user32.NewProc("MonitorFromWindow")
	pGetMonitorInfo  = user32.NewProc("GetMonitorInfoW")
	pLoadImage       = user32.NewProc("LoadImageW")
	pGetWindowLong   = user32.NewProc("GetWindowLongPtrW")
	pSetWindowLong   = user32.NewProc("SetWindowLongPtrW")
	pCallWindowProc  = user32.NewProc("CallWindowProcW")
	pGetModuleHandle = syscall.NewLazyDLL("kernel32.dll").NewProc("GetModuleHandleW")
)

const (
	gwlpWndProc  = ^uintptr(3)  // -4  GWL_WNDPROC
	gwlExStyle   = ^uintptr(19) // -20 GWL_EXSTYLE

	wsExLayered = 0x00080000
	lwaAlpha    = 0x00000002

	swpNoZorder    = 0x0004
	swpFrameChange = 0x0020

	swMinimize = 6
	swShow     = 5

	wmNcCalcSize    = 0x0083
	wmNcHitTest     = 0x0084
	wmNcLButtonDown = 0x00A1
	htCaption       = 2
)

type rect struct{ Left, Top, Right, Bottom int32 }

type monitorInfo struct {
	CbSize    uint32
	RcMonitor rect
	RcWork    rect
	DwFlags   uint32
}

var (
	origWndProc uintptr
	wndProcCb   uintptr // keep the callback alive

	savedRect   rect
	isMaximized bool
)

// decorateWindow turns the window frameless (so the web draws its own title bar)
// without leaving the leftover black non-client strip, and sets the dark hint +
// app icon. Window buttons / dragging come from the injected web bar via win*.
func decorateWindow(hwnd uintptr) {
	if hwnd == 0 {
		return
	}
	setDarkTitleBar(hwnd)
	setWindowIcon(hwnd)
	installFrameless(hwnd)
}

func setDarkTitleBar(hwnd uintptr) {
	proc := syscall.NewLazyDLL("dwmapi.dll").NewProc("DwmSetWindowAttribute")
	var enabled int32 = 1
	for _, attr := range []uintptr{20, 19} {
		proc.Call(hwnd, attr, uintptr(unsafe.Pointer(&enabled)), unsafe.Sizeof(enabled))
	}
}

func setWindowIcon(hwnd uintptr) {
	hInst, _, _ := pGetModuleHandle.Call(0)
	const (
		imageIcon     = 1
		lrDefaultSize = 0x40
		lrShared      = 0x8000
		wmSetIcon     = 0x0080
	)
	hIcon, _, _ := pLoadImage.Call(hInst, 1, imageIcon, 0, 0, lrDefaultSize|lrShared)
	if hIcon == 0 {
		return
	}
	pSendMessage.Call(hwnd, wmSetIcon, 0, hIcon)
	pSendMessage.Call(hwnd, wmSetIcon, 1, hIcon)
}

// installFrameless subclasses the window so WM_NCCALCSIZE reports zero non-client
// area (the title bar / borders vanish — no black strip — and the web content
// fills the whole window). WM_NCHITTEST is handled to keep edge-resize working.
// hideWindow makes the window invisible via a layered alpha=0 so WebView2 can
// render in the background without the white-flash being visible. winReveal()
// makes it opaque again — no minimize, no taskbar interaction needed.
func hideWindow(hwnd uintptr) {
	pSetLayered := user32.NewProc("SetLayeredWindowAttributes")
	exStyle, _, _ := pGetWindowLong.Call(hwnd, gwlExStyle)
	pSetWindowLong.Call(hwnd, gwlExStyle, exStyle|wsExLayered)
	pSetLayered.Call(hwnd, 0, 0, lwaAlpha) // alpha = 0
}

func installFrameless(hwnd uintptr) {
	wndProcCb = syscall.NewCallback(wndProc)
	prev, _, _ := pSetWindowLong.Call(hwnd, gwlpWndProc, wndProcCb)
	origWndProc = prev
	// Force a frame recalculation so the new non-client size takes effect now.
	pSetWindowPos.Call(hwnd, 0, 0, 0, 0, 0, 0x0002|0x0001|swpNoZorder|swpFrameChange)
}

func wndProc(hwnd, msg, wparam, lparam uintptr) uintptr {
	switch msg {
	case wmNcCalcSize:
		if wparam != 0 {
			return 0 // claim the entire window as client area
		}
	case wmNcHitTest:
		return hitTest(hwnd, lparam)
	}
	r, _, _ := pCallWindowProc.Call(origWndProc, hwnd, msg, wparam, lparam)
	return r
}

// hitTest re-creates an 8px resize border around the now-frameless window.
func hitTest(hwnd, lparam uintptr) uintptr {
	x := int32(int16(lparam & 0xffff))
	y := int32(int16((lparam >> 16) & 0xffff))

	var r rect
	pGetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&r)))

	const b = 8
	left := x < r.Left+b
	right := x >= r.Right-b
	top := y < r.Top+b
	bottom := y >= r.Bottom-b

	const (
		htClient      = 1
		htLeft        = 10
		htRight       = 11
		htTop         = 12
		htTopLeft     = 13
		htTopRight    = 14
		htBottom      = 15
		htBottomLeft  = 16
		htBottomRight = 17
	)
	switch {
	case top && left:
		return htTopLeft
	case top && right:
		return htTopRight
	case bottom && left:
		return htBottomLeft
	case bottom && right:
		return htBottomRight
	case left:
		return htLeft
	case right:
		return htRight
	case top:
		return htTop
	case bottom:
		return htBottom
	}
	return htClient
}

// winReveal makes the window fully opaque and brings it to the foreground.
// Called from JS after DOMContentLoaded + a short delay so dark CSS is painted.
func winReveal(hwnd uintptr) {
	pSetLayered := user32.NewProc("SetLayeredWindowAttributes")
	pSetForeground := user32.NewProc("SetForegroundWindow")
	pSetLayered.Call(hwnd, 0, 255, lwaAlpha) // alpha = 255 (fully opaque)
	pSetForeground.Call(hwnd)
}

func winMinimize(hwnd uintptr) { pShowWindow.Call(hwnd, swMinimize) }

func winToggleMaximize(hwnd uintptr) {
	if isMaximized {
		pSetWindowPos.Call(hwnd, 0,
			uintptr(savedRect.Left), uintptr(savedRect.Top),
			uintptr(savedRect.Right-savedRect.Left), uintptr(savedRect.Bottom-savedRect.Top),
			swpNoZorder|swpFrameChange)
		isMaximized = false
		return
	}
	pGetWindowRect.Call(hwnd, uintptr(unsafe.Pointer(&savedRect)))

	hmon, _, _ := pMonitorFromWin.Call(hwnd, 2 /*MONITOR_DEFAULTTONEAREST*/)
	var mi monitorInfo
	mi.CbSize = uint32(unsafe.Sizeof(mi))
	pGetMonitorInfo.Call(hmon, uintptr(unsafe.Pointer(&mi)))
	w := mi.RcWork
	pSetWindowPos.Call(hwnd, 0,
		uintptr(w.Left), uintptr(w.Top),
		uintptr(w.Right-w.Left), uintptr(w.Bottom-w.Top),
		swpNoZorder|swpFrameChange)
	isMaximized = true
}

func winDragStart(hwnd uintptr) {
	if isMaximized {
		winToggleMaximize(hwnd)
	}
	pReleaseCapture.Call()
	pSendMessage.Call(hwnd, wmNcLButtonDown, htCaption, 0)
}
