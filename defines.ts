// This file defines all the compile-time constants that are used in the project.

// YYYYMMDDHHMM
const dateFmt = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  calendar: 'gregory',
});

export default {
  BUILD_VERSION: dateFmt.format(new Date()).replace(/\D/g, ''),
};
