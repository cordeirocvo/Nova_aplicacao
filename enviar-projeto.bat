@echo off
:: Configura o console para UTF-8 para exibir acentos corretamente no Windows
chcp 65001 > nul
title Cordeiro Energia - Envio Automático (GitHub + Vercel)
color 0B
cls

echo ======================================================================
echo           🚀 CORDEIRO ENERGIA - SISTEMA DE DEPLOY AUTOMÁTICO 🚀
echo ======================================================================
echo.
echo Este script irá realizar as seguintes ações de forma automatizada:
echo.
echo   1. 📂 Adicionar todas as alterações locais ao Git (git add .)
echo   2. 📝 Criar um commit com mensagem personalizada ou automática
echo   3. 📤 Enviar as alterações para o GitHub (git push)
echo   4. ⚡ Disparar e finalizar o deploy de produção na Vercel
echo.
echo ======================================================================
echo.

cd /d "%~dp0"

:: Pergunta pela mensagem do commit
set "COMMIT_MSG="
set /p COMMIT_MSG="Digite a mensagem do commit (ou pressione ENTER para usar a padrão): "

echo.
echo ======================================================================
echo 🛠️  Processando o deploy... Aguarde.
echo ======================================================================
echo.

:: Executa o deploy com a mensagem informada ou vazia (que usará o padrão no script)
if "%COMMIT_MSG%"=="" (
    npm run deploy
) else (
    npm run deploy -- "%COMMIT_MSG%"
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    color 0C
    echo ======================================================================
    echo ❌ OCORREU UM ERRO DURANTE O PROCESSO DE DEPLOY!
    echo ======================================================================
    echo Por favor, verifique os erros exibidos acima no console.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================================
echo 🎉 PROCESSO CONCLUÍDO COM SUCESSO!
echo ======================================================================
echo.
echo Seu código já está salvo no GitHub e a versão de produção está no ar!
echo.
echo ======================================================================
echo.
pause
