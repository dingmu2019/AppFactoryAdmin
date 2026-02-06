export const skills = {
    title: "Skills Management",
    subtitle: "Manage AI Skills (Plugins). Upload ZIP packages containing manifest.json to add new capabilities.",
    total: "Total Skills",
    active: "Active",
    refresh: "Refresh",
    upload: "Upload Skill",
    searchPlaceholder: "Search skills by name or command...",
    filter: "Filter",
    noSkills: "No Skills Found",
    noSkillsDesc: "No AI skills installed. Upload a skill package to extend capabilities.",
    uploadNow: "Upload Now",
    card: {
      version: "v",
      by: "by",
      command: "Command",
      enable: "Enable",
      disable: "Disable",
      delete: "Delete"
    },
    uploadModal: {
      title: "Upload New Skill",
      dragDrop: "Click to upload or drag and drop",
      fileLimit: "ZIP files only (max 50MB)",
      manifestHint: "Package must include",
      cancel: "Cancel",
      uploading: "Uploading...",
      upload: "Upload Skill",
      remove: "Remove file"
    },
    messages: {
      uploadSuccess: "Skill uploaded successfully",
      deleteSuccess: "Skill deleted successfully",
      statusUpdated: "Skill status updated",
      deleteConfirmTitle: "Delete Skill",
      deleteConfirmDesc: "Are you sure you want to delete this skill? This action cannot be undone.",
      deleteConfirmBtn: "Delete"
    },
    errors: {
        invalidFile: "Only .zip files are allowed",
        sizeExceeded: "File size exceeds 50MB limit",
        uploadFailed: "Upload failed",
        generic: "Operation failed"
    }
};