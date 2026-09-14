@echo off
rem Weekly publish: convert the Excel workbooks and push to GitHub Pages.
cd /d "%~dp0"

echo Converting Excel workbooks...
python tools\convert.py
if errorlevel 1 (
    echo.
    echo Convert failed - is an Excel workbook open or missing?
    pause
    exit /b 1
)

git add -A
git diff --cached --quiet && (
    echo Nothing new to publish.
    pause
    exit /b 0
)

git commit -m "Weekly LME update (%date%)"
git push
echo.
echo Published! The site updates in about a minute:
echo https://fuzzyd496.github.io/stray-alliance/
pause
