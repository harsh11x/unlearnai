; Unlearn Studio — NSIS Installer Customizations
; This file is included by electron-builder's NSIS template

!macro customInit
  ; Check for .NET or VC++ runtime if needed
  ; Add custom pre-install steps here
!macroend

!macro customInstallMode
  ; Default to per-user installation
  StrCpy $isForceCurrentInstallMode "1"
!macroend
