@echo off
:: Configura o console para UTF-8 para exibir acentos corretamente no Windows
chcp 65001 > nul
title Cordeiro Energia - Configurar Inicialização Automática
color 0A
cls

echo ======================================================================
echo          ⚙️ CONFIGURAR INICIALIZAÇÃO AUTOMÁTICA DO SERVIDOR ⚙️
echo ======================================================================
echo.
echo Este script irá configurar o servidor local para iniciar automaticamente
echo sempre que você ligar o seu computador (ao fazer login no Windows).
echo.
echo O servidor será iniciado de forma MINIMIZADA na barra de tarefas,
echo mantendo a porta 3000 ativa e pronta para uso em http://localhost:3000
echo sem atrapalhar o seu trabalho.
echo.
echo ======================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo [PASSO 1] Criando atalho na pasta de Inicialização do Windows...
echo Pasta de Destino: %STARTUP_DIR%
echo.

:: Cria o script VBS temporário para gerar o atalho com estilo de janela minimizada (WindowStyle = 7)
set "VBS_FILE=%TEMP%\CreateShortcut.vbs"
echo Set oWS = CreateObject("WScript.Shell") > "%VBS_FILE%"
echo sLinkFile = "%STARTUP_DIR%\CordeiroEnergiaServer.lnk" >> "%VBS_FILE%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_FILE%"
echo oLink.TargetPath = "%SCRIPT_DIR%iniciar-servidor.bat" >> "%VBS_FILE%"
echo oLink.WorkingDirectory = "%SCRIPT_DIR%" >> "%VBS_FILE%"
echo oLink.Description = "Servidor Local Cordeiro Energia" >> "%VBS_FILE%"
echo oLink.WindowStyle = 7 >> "%VBS_FILE%"
echo oLink.Save >> "%VBS_FILE%"

:: Executa o VBScript para gerar o atalho
cscript /nologo "%VBS_FILE%"
del "%VBS_FILE%"

echo.
echo ======================================================================
echo ✅ CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!
echo ======================================================================
echo.
echo O servidor local iniciará automaticamente (minimizado na barra de tarefas)
echo sempre que você iniciar o Windows.
echo.
echo DICA: Se você quiser iniciar o servidor manualmente agora, basta
echo dar dois cliques no arquivo "iniciar-servidor.bat" na pasta do seu projeto.
echo.
echo Para remover a inicialização automática no futuro, basta apagar o arquivo:
echo "%STARTUP_DIR%\CordeiroEnergiaServer.lnk"
echo.
echo ======================================================================
echo.
pause
