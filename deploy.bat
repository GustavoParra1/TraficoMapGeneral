@echo off
cd /d %~dp0
echo Iniciando deploy a Firebase...
firebase deploy --only hosting
pause
