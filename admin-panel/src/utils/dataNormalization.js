// Generate school abbreviation from school name
// Examples: "St. Michael" → "ST", "Lincoln Elementary" → "LI"
export const generateSchoolAbbreviation = (schoolName) => {
  if (!schoolName) return 'XX';
  
  // Remove common prefixes and suffixes
  let cleaned = schoolName
    .replace(/^(St\.|Saint|St)\s+/i, '')
    .replace(/\s+(Elementary|Middle|High|School|Academy|Acad)$/i, '')
    .trim();
  
  // Extract first letters of words
  const words = cleaned.split(/\s+/);
  
  if (words.length >= 2) {
    // Use first letter of first two words
    return (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1) {
    // Use first two letters of single word
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return 'XX';
};

// Normalize grade input to database format
// Database expects: 'Pre-K (3)', 'Pre-K (4)', 'Kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'
export const normalizeGrade = (input) => {
  if (!input) return '';
  
  const normalized = String(input).trim().toLowerCase().replace(/[()]/g, '').replace(/\s+/g, ' ');
  
  // Pre-K 3 variations - many formats accepted
  // pk3, prek3, pre-k3, pre k 3, pre-k-3, pre-k (3), prek-3, p3, pre3, prek 3, prekindergarten 3, etc.
  if (/^p[-\s]?k?[-\s]?3$|^pre[-\s]?k[-\s]?3|^prek[-\s]?3|^pre[-\s]?kindergarten[-\s]?3|^pre[-\s]?k[-\s]?three|^p[-\s]?3$/i.test(normalized)) {
    return 'Pre-K (3)';
  }
  
  // Pre-K 4 variations - many formats accepted
  // pk4, prek4, pre-k4, pre k 4, pre-k-4, pre-k (4), prek-4, p4, pre4, prek 4, prekindergarten 4, etc.
  if (/^p[-\s]?k?[-\s]?4$|^pre[-\s]?k[-\s]?4|^prek[-\s]?4|^pre[-\s]?kindergarten[-\s]?4|^pre[-\s]?k[-\s]?four|^p[-\s]?4$/i.test(normalized)) {
    return 'Pre-K (4)';
  }
  
  // Generic Pre-K (defaults to Pre-K 4)
  // pk, prek, pre-k, pre k, prekindergarten, pre kindergarten
  if (/^p[-\s]?k$|^pre[-\s]?k$|^prek$|^pre[-\s]?kindergarten$/i.test(normalized)) {
    return 'Pre-K (4)'; // Default to Pre-K (4) if just "Pre-K"
  }
  
  // Kindergarten variations - must return 'Kindergarten'
  // k, kg, kinder, kindergarten, kind, kgarten
  if (/^k$|^kg$|^kindergarten$|^kinder$|^kind$|^kgarten$|^kindy$/i.test(normalized)) {
    return 'Kindergarten';
  }
  
  // Number grades (1-12) - must return ordinal format: '1st', '2nd', '3rd', '4th', etc.
  const gradeMap = {
    // First grade
    '1': '1st', 'first': '1st', '1st': '1st', 'one': '1st',
    // Second grade
    '2': '2nd', 'second': '2nd', '2nd': '2nd', 'two': '2nd',
    // Third grade
    '3': '3rd', 'third': '3rd', '3rd': '3rd', 'three': '3rd',
    // Fourth grade
    '4': '4th', 'fourth': '4th', '4th': '4th', 'four': '4th',
    // Fifth grade
    '5': '5th', 'fifth': '5th', '5th': '5th', 'five': '5th',
    // Sixth grade
    '6': '6th', 'sixth': '6th', '6th': '6th', 'six': '6th',
    // Seventh grade
    '7': '7th', 'seventh': '7th', '7th': '7th', 'seven': '7th',
    // Eighth grade
    '8': '8th', 'eighth': '8th', '8th': '8th', 'eight': '8th',
    // Ninth grade
    '9': '9th', 'ninth': '9th', '9th': '9th', 'nine': '9th',
    // Tenth grade
    '10': '10th', 'tenth': '10th', '10th': '10th', 'ten': '10th',
    // Eleventh grade
    '11': '11th', 'eleventh': '11th', '11th': '11th', 'eleven': '11th',
    // Twelfth grade
    '12': '12th', 'twelfth': '12th', '12th': '12th', 'twelve': '12th',
  };
  
  // Check for exact matches
  if (gradeMap[normalized]) {
    return gradeMap[normalized];
  }
  
  // Check for patterns like "f-i-f-t-h" or "5th grade"
  const numericMatch = normalized.match(/^(\d+)/);
  if (numericMatch) {
    const num = parseInt(numericMatch[1]);
    if (num >= 1 && num <= 12) {
      // Convert to ordinal
      const suffixes = ['th', 'st', 'nd', 'rd'];
      const v = num % 100;
      return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    }
  }
  
  // Try to extract number from written form
  for (const [key, value] of Object.entries(gradeMap)) {
    if (normalized.includes(key) && key.length > 1) {
      return value;
    }
  }
  
  // If it's just a number 1-12, convert to ordinal
  const num = parseInt(normalized);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }
  
  return input.trim(); // Return original if can't normalize
};

// Normalize gender input
// Database expects: 'Male', 'Female', 'Other' (capitalized, with CHECK constraint)
export const normalizeGender = (input) => {
  if (!input) return '';
  
  const normalized = String(input).trim().toLowerCase();
  
  // Male variations - must return 'Male'
  if (/^m$|^male$|^m\.|^masculine$/i.test(normalized)) {
    return 'Male';
  }
  
  // Female variations - must return 'Female'
  if (/^f$|^female$|^f\.|^feminine$/i.test(normalized)) {
    return 'Female';
  }
  
  // Other/Non-binary variations - must return 'Other'
  if (/other|non[-\s]?binary|nb|nonbinary|gender[-\s]?queer|gq|agender|bigender|genderfluid|two[-\s]?spirit|trans|transgender/i.test(normalized)) {
    return 'Other';
  }
  
  // Default to original if can't match (capitalize first letter)
  const trimmed = input.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

// Normalize status input
// Database expects: 'New', 'Returning' (capitalized, with CHECK constraint)
export const normalizeStatus = (input) => {
  if (!input) return 'New';
  
  const normalized = String(input).trim().toLowerCase();
  
  // Returning variations: r, ret, return, returning, re, old, existing, 2nd year, repeat, comeback
  if (/^r$|^re$|^ret$|^return$|^returning$|^old$|^existing$|^2nd[-\s]?year$|^repeat$|^comeback$|^continuing$/i.test(normalized)) {
    return 'Returning';
  }
  
  // New variations: n, new, first, 1st, first-time, new-student, fresh, newbie, freshman (if context)
  if (/^n$|^new$|^first$|^1st$|^first[-\s]?time$|^new[-\s]?student$|^fresh$|^newbie$|^ne$/i.test(normalized)) {
    return 'New';
  }
  
  return 'New'; // Default
};

// Normalize date input (handle various formats)
export const normalizeDate = (input) => {
  if (!input) return '';
  
  const str = String(input).trim();
  
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // Try to parse various date formats
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return str; // Return original if can't parse
};

// Normalize school name (fuzzy matching)
export const normalizeSchoolName = (input, availableSchools) => {
  if (!input) return '';
  
  const normalized = String(input).trim();
  
  // Exact match (case-insensitive)
  const exactMatch = availableSchools.find(
    school => school.name.toLowerCase() === normalized.toLowerCase()
  );
  if (exactMatch) return exactMatch.name;
  
  // Partial match
  const partialMatch = availableSchools.find(
    school => school.name.toLowerCase().includes(normalized.toLowerCase()) ||
              normalized.toLowerCase().includes(school.name.toLowerCase())
  );
  if (partialMatch) return partialMatch.name;
  
  // Return original if no match found
  return normalized;
};
