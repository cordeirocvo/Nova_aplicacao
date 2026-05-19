@echo off
:: Configura o console para UTF-8 para exibir acentos corretamente no Windows
chcp 65001 > nul
title Cordeiro Energia - Servidor Local (Next.js)
color 0B
cls

echo ======================================================================
echo           🚀 CORDEIRO ENERGIA - SERVIDOR LOCAL DE DESENVOLVIMENTO 🚀
echo ======================================================================
echo.
echo [INFO] Caminho do Projeto: %~dp0
echo [INFO] Iniciando o servidor de desenvolvimento Next.js...
echo [INFO] O site estará disponível em: http://localhost:3000
echo.
echo [DICA] Para encerrar o servidor, basta fechar esta janela ou pressionar CTRL + C.
echo ======================================================================
echo.

cd /d "%~dp0"

:: Executa a geração do Prisma e depois inicia o servidor de desenvolvimento
echo [DATABASE] Gerando cliente Prisma...
call npx prisma generate

echo.
echo [SERVER] Iniciando o servidor...
npm run dev

echo.
echo [INFO] Servidor finalizado.
pause
