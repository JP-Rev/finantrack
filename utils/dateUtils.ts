
export const getCurrentDateISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const formatDate = (dateString: string): string => {
  if (!dateString || !dateString.includes('-')) return 'Fecha inválida';
  const parts = dateString.split('-');
  if (parts.length !== 3) return 'Fecha inválida';
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

export const addMonthsToDate = (dateString: string, months: number): string => {
  const date = new Date(dateString);
  // Ensure we are working with UTC dates to avoid timezone shifts when only month/day/year is relevant
  date.setUTCDate(date.getUTCDate()); // Use UTC day
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().split('T')[0];
};

export const getSpanishMonthName = (monthNumber: number): string => { // 0-indexed for Date.getMonth()
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    if (monthNumber >= 0 && monthNumber < 12) {
        return months[monthNumber];
    }
    return "Mes Inválido";
};

export const formatMonthYearForDisplay = (monthYearString: string): string => { // Expects "YYYY-MM"
    if (!monthYearString || monthYearString.length !== 7 || !monthYearString.includes('-')) {
        return "Fecha Inválida";
    }
    const [year, month] = monthYearString.split('-');
    const monthIndex = parseInt(month, 10) - 1; // Convert to 0-indexed for getSpanishMonthName
    if (isNaN(monthIndex)) return "Fecha Inválida";
    return `${getSpanishMonthName(monthIndex)} ${year}`;
};

export const getCurrentMonthYear = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed, add 1
    return `${year}-${month}`;
};
