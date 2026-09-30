on run argv
    if (count argv) is not 2 then error "Required: updated contact IDs file, expected My Card ID"
    set targetIDs to paragraphs of (read POSIX file (item 1 of argv) as «class utf8»)
    set expectedMyCard to item 2 of argv
    tell application "Contacts"
        -- Compare the scalar ID; comparing the live card reference can raise -1700.
        set currentMyCardID to get id of my card
        if currentMyCardID is not expectedMyCard then error "My Card changed"
        set matchingGroups to every group whose name is "Contacts+"
        if (count matchingGroups) is greater than 1 then error "More than one Contacts+ list exists"
        if (count matchingGroups) is 0 then
            set targetGroup to make new group with properties {name:"Contacts+"}
        else
            set targetGroup to item 1 of matchingGroups
        end if
        set existingIDs to id of every person of targetGroup
        set deferredIDs to {}
        repeat with targetID in targetIDs
            set targetID to targetID as text
            if targetID is not "" and targetID is not in existingIDs then
                set p to person id targetID
                if image of p is missing value then
                    set end of deferredIDs to targetID
                else
                    add p to targetGroup
                end if
            end if
        end repeat
        save
        set actualIDs to id of every person of targetGroup
        set reportText to ""
        repeat with targetID in targetIDs
            if (targetID as text) is not "" then
                if (targetID as text) is in actualIDs then
                    set reportText to reportText & "verified" & tab & (targetID as text) & linefeed
                else if (targetID as text) is in deferredIDs then
                    set reportText to reportText & "deferred" & tab & (targetID as text) & linefeed
                else
                    error "List membership verification failed"
                end if
            end if
        end repeat
        -- Compare the scalar ID; comparing the live card reference can raise -1700.
        set currentMyCardID to get id of my card
        if currentMyCardID is not expectedMyCard then error "My Card changed after list update"
        return reportText
    end tell
end run
