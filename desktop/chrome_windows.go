//go:build windows

package main

import (
	"syscall"
	"unsafe"
)

// decorateWindow makes the native chrome match the dark Zenify UI: it switches
// the title bar to dark mode and assigns the embedded app icon (resource ID 1,
// linked in via zenify.syso) so it shows in the title bar and taskbar.
func decorateWindow(hwnd uintptr) {
	if hwnd == 0 {
		return
	}
	setDarkTitleBar(hwnd)
	setWindowIcon(hwnd)
	setFramelessWindow(hwnd)
}

func setDarkTitleBar(hwnd uintptr) {
	proc := syscall.NewLazyDLL("dwmapi.dll").NewProc("DwmSetWindowAttribute")
	var enabled int32 = 1
	// DWMWA_USE_IMMERSIVE_DARK_MODE = 20 on Win10 1903+/11, 19 on older builds.
	for _, attr := range []uintptr{20, 19} {
		proc.Call(hwnd, attr, uintptr(unsafe.Pointer(&enabled)), unsafe.Sizeof(enabled))
	}
}

func setWindowIcon(hwnd uintptr) {
	hInst, _, _ := syscall.NewLazyDLL("kernel32.dll").
		NewProc("GetModuleHandleW").Call(0)

	user32 := syscall.NewLazyDLL("user32.dll")
	loadImage := user32.NewProc("LoadImageW")
	sendMessage := user32.NewProc("SendMessageW")

	const (
		imageIcon     = 1
		lrDefaultSize = 0x40
		lrShared      = 0x8000
		wmSetIcon     = 0x0080
		iconSmall     = 0
		iconBig       = 1
	)

	// MAKEINTRESOURCE(1) — matches `1 ICON "logo.ico"` in zenify.rc.
	hIcon, _, _ := loadImage.Call(hInst, 1, imageIcon, 0, 0, lrDefaultSize|lrShared)
	if hIcon == 0 {
		return
	}
	sendMessage.Call(hwnd, wmSetIcon, iconSmall, hIcon)
	sendMessage.Call(hwnd, wmSetIcon, iconBig, hIcon)
}

// setFramelessWindow removes the default Windows title bar and borders.
func setFramelessWindow(hwnd uintptr) {
	user32 := syscall.NewLazyDLL("user32.dll")
	setWindowLong := user32.NewProc("SetWindowLongW")
	getWindowLong := user32.NewProc("GetWindowLongW")

	const wsCaption = 0x00C00000
	gwlStyle := int32(-16)

	// Get current window style
	style, _, _ := getWindowLong.Call(hwnd, uintptr(gwlStyle))
	
	// Remove the title bar (WS_CAPTION)
	style = style &^ wsCaption
	
	// Set the new style
	setWindowLong.Call(hwnd, uintptr(gwlStyle), style)
}
