on homePath()
	return POSIX path of (path to home folder as text)
end homePath

on serviceScriptPath()
	return my homePath() & "Library/Application Support/CrystalBudget/cb-service.sh"
end serviceScriptPath

on ensureScript()
	set supportScript to my serviceScriptPath()
	set bundled to (POSIX path of (path to me)) & "Contents/Resources/cb-service.sh"
	set supportDir to my homePath() & "Library/Application Support/CrystalBudget"
	-- Shell builtins only: /usr/bin/test does not exist on macOS
	do shell script "cd \"$HOME\" && /bin/mkdir -p " & quoted form of supportDir & " && if [ -f " & quoted form of bundled & " ]; then /bin/cp -f " & quoted form of bundled & " " & quoted form of supportScript & "; fi && /bin/chmod +x " & quoted form of supportScript & " && [ -x " & quoted form of supportScript & " ]"
end ensureScript

on showNoAccess()
	set answer to display dialog "macOS не даёт CrystalBudget открыть папку «Документы», где лежит проект." & return & return & "Откройте «Конфиденциальность → Файлы и папки» и включите «Папка Документы» для CrystalBudget. Если CrystalBudget там нет — добавьте его в «Полный доступ к диску»." buttons {"Закрыть", "Открыть настройки"} default button "Открыть настройки" with title "CrystalBudget" with icon caution
	if button returned of answer is "Открыть настройки" then
		do shell script "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_FilesAndFolders'"
	end if
end showNoAccess

on runService(verb)
	try
		my ensureScript()
		return do shell script "cd \"$HOME\" && /bin/bash " & quoted form of my serviceScriptPath() & " " & verb
	on error errMsg number errNum
		if errMsg contains "NO_DOCUMENTS_ACCESS" or errMsg contains "uv_cwd" or errMsg contains "Operation not permitted" then
			my showNoAccess()
			return ""
		end if
		return "Ошибка (" & errNum & "): " & errMsg
	end try
end runService

on currentStatus()
	try
		my ensureScript()
		set statusText to do shell script "cd \"$HOME\" && /bin/bash " & quoted form of my serviceScriptPath() & " status"
		if statusText starts with "running" then
			return "Сервис работает · http://127.0.0.1:8080"
		else
			return "Сервис остановлен"
		end if
	on error errMsg
		return "Статус неизвестен" & return & errMsg
	end try
end currentStatus

on showResult(resultText)
	if resultText is not "" then
		display dialog resultText buttons {"OK"} default button 1 with title "CrystalBudget"
	end if
end showResult

on run
	-- Touch the project from the app itself so macOS asks for Documents access up front
	try
		do shell script "cat " & quoted form of (my homePath() & "Documents/cb_v2/package.json") & " >/dev/null"
	end try

	set keepGoing to true
	repeat while keepGoing
		set statusLine to my currentStatus()
		set picked to choose from list {"Старт", "Стоп", "Открыть в браузере"} with title "CrystalBudget" with prompt (statusLine & return & return & "Выберите действие:") OK button name "Выбрать" cancel button name "Закрыть" default items {"Старт"}
		if picked is false then
			set keepGoing to false
		else
			set pressed to item 1 of picked
			if pressed is "Старт" then
				my showResult(my runService("start"))
			else if pressed is "Стоп" then
				my showResult(my runService("stop"))
			else if pressed is "Открыть в браузере" then
				set resultText to my runService("start")
				if resultText is not "" and resultText does not start with "Ошибка" then
					do shell script "open 'http://127.0.0.1:8080/'"
					set keepGoing to false
				else
					my showResult(resultText)
				end if
			end if
		end if
	end repeat
end run
