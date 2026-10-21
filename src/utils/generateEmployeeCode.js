export const generateEmployeeCode = (fname, lname) => {
    const initials = (fname[0] + lname[0]).toUpperCase();
    const uniqueNumber = Date.now().toString().slice(-3);
    return `${initials}${uniqueNumber}`;
  };