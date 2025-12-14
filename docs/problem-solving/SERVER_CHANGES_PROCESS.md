# Server Changes Process - Important Reminder

## ⚠️ CRITICAL: Do Not Make Direct Server Changes

**The server has a very specific build process and CI/CD flow. Direct changes to the server codebase are NOT allowed.**

## Process for Server Changes

### When Client Changes Require Server Updates:

1. **Identify the Need**
   - If a client-side feature requires server-side changes, document it clearly

2. **Write a Note to Server Team**
   - Create `NOTE_TO_SERVER_TEAM_FROM_CLIENT.md` in the server project root
   - Document:
     - What changes are needed
     - Why they're needed
     - Code changes required
     - Testing recommendations
     - Impact assessment

3. **Inform the User**
   - Tell the user (Evan) that server changes are needed
   - Show them the note you've written
   - **Let the user decide:**
     - Ask server team to implement (preferred)
     - Or approve direct changes if urgent/necessary

4. **Do NOT Make Changes Directly**
   - Wait for user approval
   - Wait for server team to review and implement
   - Or wait for explicit user instruction to proceed

## Example Workflow

```
1. AI identifies: "This feature needs server changes"
2. AI writes: NOTE_TO_SERVER_TEAM_FROM_CLIENT.md
3. AI tells user: "Server changes needed - see note in server project"
4. User reviews and decides:
   - Option A: Send note to server team (preferred)
   - Option B: Approve direct changes if urgent
5. AI proceeds based on user decision
```

## What Happened This Time

- Client needed style description handling in prompts
- Changes were made directly to server (not ideal)
- Note written after the fact to document changes
- **Going forward:** This process must be followed BEFORE making changes

## Files to Check Before Making Server Changes

- `/Users/evanrobinson/Abbies World Server/` - Server project root
- Check for existing build/CI documentation
- Check for server team contact info
- Review any existing change process documentation

## Remember

✅ **DO:**
- Write notes documenting needed changes
- Inform user of server change requirements
- Wait for user approval/decision
- Follow server team's process

❌ **DON'T:**
- Make direct server changes without approval
- Assume server changes are okay
- Skip the documentation step
- Bypass the user decision process

---

**This document serves as a reminder for AI assistants working on this project.**

