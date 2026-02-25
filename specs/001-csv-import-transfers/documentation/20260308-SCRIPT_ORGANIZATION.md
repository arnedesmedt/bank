# Script Organization Update

**Date:** March 8, 2026  
**Change:** Moved JWT permissions fix script to organized location

## What Changed

Moved `fix-jwt-permissions.sh` from project root to `backend/scripts/` directory for better organization.

### Before
```
bank/
├── fix-jwt-permissions.sh  ← Script at root level
├── backend/
└── frontend/
```

### After
```
bank/
├── backend/
│   └── scripts/
│       ├── fix-jwt-permissions.sh  ← Organized location
│       ├── README.md               ← Documentation
│       └── .gitignore
├── frontend/
```

## Benefits

1. **Better Organization**: Scripts are now in a dedicated directory
2. **Scalability**: Easy to add more utility scripts in the future
3. **Documentation**: Added README.md explaining available scripts
4. **Discoverability**: Clear location for all backend utility scripts

## Updated Files

### Script
- ✅ Moved `fix-jwt-permissions.sh` → `backend/scripts/fix-jwt-permissions.sh`
- ✅ Updated script paths (now navigates from `backend/scripts/` to project root)
- ✅ Made script executable (`chmod +x`)

### Documentation
- ✅ Updated `specs/.../20260308-COMPLETE_RESOLUTION.md` (4 references)
- ✅ Updated `specs/.../20260308-OAUTH2_RESOLUTION.md` (3 references)
- ✅ Created `backend/scripts/README.md` - Scripts documentation
- ✅ Created `backend/scripts/.gitignore` - Ensures directory is tracked

## New Script Location

**Path:** `backend/scripts/fix-jwt-permissions.sh`

**Usage (from project root):**
```bash
./backend/scripts/fix-jwt-permissions.sh
```

**Usage (with chmod):**
```bash
chmod +x backend/scripts/fix-jwt-permissions.sh
./backend/scripts/fix-jwt-permissions.sh
```

## How It Works Now

The script automatically navigates to the project root:

```bash
# Change to project root (backend/scripts -> backend -> project root)
cd "$(dirname "$0")/../.."
```

This means it works correctly regardless of where it's called from:
- ✅ From project root: `./backend/scripts/fix-jwt-permissions.sh`
- ✅ From backend: `./scripts/fix-jwt-permissions.sh`
- ✅ From anywhere: `/full/path/to/backend/scripts/fix-jwt-permissions.sh`

## Backend Scripts Directory

The `backend/scripts/` directory is now the official location for:

- Utility scripts
- Maintenance scripts
- Development helpers
- Deployment scripts

### Current Scripts

1. **fix-jwt-permissions.sh**
   - Fixes JWT key file permissions for www-data user
   - Restarts PHP container
   - Tests OAuth2 endpoint

### Adding New Scripts

See `backend/scripts/README.md` for guidelines on adding new scripts.

## Verification

```bash
# Check script exists and is executable
ls -la backend/scripts/fix-jwt-permissions.sh
# Should show: -rwxr-xr-x

# Check documentation exists
ls -la backend/scripts/README.md
# Should exist

# Test script (if needed)
./backend/scripts/fix-jwt-permissions.sh
```

## No Breaking Changes

All documentation has been updated to reflect the new location. The script works exactly the same way, just from a better-organized location.

## Files Modified

- ✅ `backend/scripts/fix-jwt-permissions.sh` - Moved and updated paths
- ✅ `specs/.../20260308-COMPLETE_RESOLUTION.md` - Updated references
- ✅ `specs/.../20260308-OAUTH2_RESOLUTION.md` - Updated references

## Files Created

- ✅ `backend/scripts/README.md` - Scripts documentation
- ✅ `backend/scripts/.gitignore` - Directory tracking
- ✅ `specs/.../20260308-SCRIPT_ORGANIZATION.md` (this file)

## Summary

✅ Script moved to better location  
✅ All documentation updated  
✅ README added for future scripts  
✅ Script remains fully functional  
✅ No breaking changes  

The backend scripts are now properly organized in `backend/scripts/`!

