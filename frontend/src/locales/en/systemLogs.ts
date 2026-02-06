export const systemLogs = {
    title: "System Logs",
    subtitle: "View runtime logs across key modules.",
    searchPlaceholder: "Filter: module / message / user / IP",
    empty: "No logs found",
    stats: {
        today: "Today's Errors",
        unresolved: "Unresolved",
        fatal: "Fatal Errors"
    },
    table: {
      time: "Time",
      level: "Level",
      module: "Module",
      message: "Message",
      path: "Path",
      resolved: "Resolved",
      details: "Details",
      status: {
          resolved: "Resolved",
          open: "Open"
      },
      actions: {
          resolve: "Mark as Resolved",
          reopen: "Reopen Issue"
      }
    },
    detail: {
        title: "Error Details",
        message: "Error Message",
        timestamp: "Timestamp",
        app: "Application",
        path: "Request Path",
        stack: "Stack Trace",
        copyTrace: "Copy Trace",
        context: "Context Data",
        system: "System / Global",
        close: "Close"
    }
};