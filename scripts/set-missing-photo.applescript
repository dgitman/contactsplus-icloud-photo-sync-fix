on run argv
    if (count argv) is less than 6 or (count argv) is greater than 7 then error "Required: contact ID, TIFF path, backup path, first name, last name, email"
    set matchKind to "email"
    if (count argv) is 7 then set matchKind to item 7 of argv
    if matchKind is not "email" and matchKind is not "phone" then error "Unknown match kind"
    set targetID to item 1 of argv
    set photoPath to item 2 of argv
    set backupPath to item 3 of argv
    if my fileExists(backupPath) or my fileExists(backupPath & ".after.vcf") then error "Backup exists; refusing overwrite"
    set photoData to read POSIX file photoPath as TIFF picture
    tell application "Contacts"
        set matches to every person whose id is targetID
        if (count matches) is not 1 then error "Expected exactly one contact"
        set p to item 1 of matches
        set actualFirst to first name of p
        set actualLast to last name of p
        if actualFirst is missing value then set actualFirst to ""
        if actualLast is missing value then set actualLast to ""
        if actualFirst is not (item 4 of argv) or actualLast is not (item 5 of argv) then error "Name mismatch"
        if matchKind is "email" then
            if (item 6 of argv) is not in (value of every email of p) then error "Email mismatch"
        else
            if (item 6 of argv) is not in (value of every phone of p) then error "Phone mismatch"
        end if
        if image of p is not missing value then error "Existing photo; refusing replacement"
        set originalNote to note of p
        set originalCard to vcard of p
    end tell
    set backupFile to open for access POSIX file backupPath with write permission
    try
        set eof backupFile to 0
        write originalCard to backupFile as «class utf8»
        close access backupFile
    on error errorText number errorNumber
        close access backupFile
        error errorText number errorNumber
    end try
    tell application "Contacts"
        set image of p to photoData
        save
        if note of p is not originalNote then error "Note verification failed"
        if image of p is missing value then error "Photo verification failed"
        set afterCard to vcard of p
    end tell
    set afterFile to open for access POSIX file (backupPath & ".after.vcf") with write permission
    try
        write afterCard to afterFile as «class utf8»
        close access afterFile
    on error errorText number errorNumber
        close access afterFile
        error errorText number errorNumber
    end try
    return "Photo saved; note unchanged"
end run

on fileExists(thePath)
    try
        set existingFile to POSIX file thePath as alias
        return true
    on error number -43
        return false
    end try
end fileExists
