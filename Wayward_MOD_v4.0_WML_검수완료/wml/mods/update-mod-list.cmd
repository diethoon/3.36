@echo off
rem Double-click after adding or removing mod folders: brings mods.js in line with the folders.
rem (new folders are added switched on near the end; entries without a folder are removed; order and :off are kept)
rem The work is done by update-mod-list.ps1 next to this file (run as a file, nothing is pieced together at run time).
rem The same file named with Korean letters prints Korean messages; an ASCII file name prints English.
if not exist "%~dp0update-mod-list.ps1" goto missing
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-mod-list.ps1" "%~f0"
if not defined WML_NOPAUSE pause
exit /b
:missing
echo [ERROR] update-mod-list.ps1 was not found next to this file. Copy the wml\mods folder of the package again.
if not defined WML_NOPAUSE pause
exit /b 1
