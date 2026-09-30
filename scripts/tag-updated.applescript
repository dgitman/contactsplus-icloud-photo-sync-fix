on run argv
    if (count argv) is not 2 then error "Required: updated contact IDs file, expected My Card ID"
    set targetIDs to paragraphs of (read POSIX file (item 1 of argv) as «class utf8»)
    set expectedMyCard to item 2 of argv
    tell application "Contacts"
        if my card is missing value then error "My Card is unset"
        if id of my card is not expectedMyCard then error "My Card changed"
        set matchingGroups to every group whose name is "Contacts+"
        if (count matchingGroups) is greater than 1 then error "More than one Contacts+ list exists"
        if (count matchingGroups) is 0 then
            set targetGroup to make new group with properties {name:"Contacts+"}
        else
            set targetGroup to item 1 of matchingGroups
        end if
        set existingIDs to id of every person of targetGroup
        repeat with targetID in targetIDs
            set targetID to targetID as text
            if targetID is not "" and targetID is not in existingIDs then
                set p to person id targetID
                if image of p is missing value then error "An updated contact no longer has a photo"
                add p to targetGroup
            end if
        end repeat
        save
        set actualIDs to id of every person of targetGroup
        set verifiedCount to 0
        repeat with targetID in targetIDs
            if (targetID as text) is not "" then
                if (targetID as text) is not in actualIDs then error "List membership verification failed"
                set verifiedCount to verifiedCount + 1
            end if
        end repeat
        if my card is missing value then error "My Card was unset after list update"
        if id of my card is not expectedMyCard then error "My Card changed after list update"
        return "Contacts+ list verified for " & verifiedCount & " updated contacts; My Card unchanged"
    end tell
end run
