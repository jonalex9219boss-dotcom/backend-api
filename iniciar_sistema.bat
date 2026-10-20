@echo off
title Sistema de Prestamos PyS
echo Iniciando servidor y base de datos...
cd /d "%~dp0"
start cmd /k "node server.js"
timeout /t 3 >nul
start http://localhost:5000
exit