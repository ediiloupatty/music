//go:build !windows

package main

// decorateWindow is a no-op outside Windows.
func decorateWindow(hwnd uintptr) {}
