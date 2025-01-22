type IndentConfig = {
  indent: string;
  newline: string;
};

const defaultConfig: IndentConfig = {
  indent: '  ',
  newline: '\n',
};

// Special characters that indicate block starts/ends
const BLOCK_START = ['{', '(', '['];
const BLOCK_END = ['}', ')', ']'];
const MAX_LINE_LENGTH = 60; // Reduced for better readability

// Language-specific formatting rules
const languageRules: Record<string, {
  lineLength: number,
  indentSize: number,
  breakPoints: string[],
  indentTriggers: string[],
  dedentTriggers: string[],
}> = {
  python: {
    lineLength: 88,  // PEP 8 recommended
    indentSize: 4,
    breakPoints: [',', 'and', 'or'],
    indentTriggers: [':', '(', '[', '{'],
    dedentTriggers: ['return', 'break', 'continue', 'pass', 'raise']
  },
  javascript: {
    lineLength: 80,
    indentSize: 2,
    breakPoints: [',', '&&', '||', '=>'],
    indentTriggers: ['{', '(', '[', '=>', 'function'],
    dedentTriggers: ['return', 'break', 'continue', 'throw']
  },
  default: {
    lineLength: 80,
    indentSize: 2,
    breakPoints: [',', '&&', '||'],
    indentTriggers: ['{', '(', '['],
    dedentTriggers: []
  }
};

const wrapLongLines = (line: string, maxLength: number, indent: string): string[] => {
  if (line.length <= maxLength) return [line];
  
  const wrapped: string[] = [];
  let currentLine = '';
  const words = line.split(/(\s+)/).filter(Boolean);

  words.forEach(word => {
    if ((currentLine + word).length > maxLength && currentLine) {
      wrapped.push(currentLine.trimEnd());
      currentLine = indent + word;
    } else {
      currentLine += word;
    }
  });

  if (currentLine) {
    wrapped.push(currentLine.trimEnd());
  }

  return wrapped;
};

const formatCode = (code: string, language: string, config: IndentConfig = defaultConfig): string => {
  const rules = languageRules[language] || languageRules.default;
  
  // Clean and normalize the code
  const lines = code
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' '.repeat(rules.indentSize))
    .split('\n')
    .map(line => line.trimRight());

  let indentLevel = 0;
  const result: string[] = [];
  const bracketStack: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      result.push('');
      continue;
    }

    // Handle indentation
    if (rules.dedentTriggers.some(trigger => line.startsWith(trigger)) ||
        line.startsWith('}') || line.startsWith(')') || line.startsWith(']')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Special handling for closing brackets
    while (line.startsWith('}') || line.startsWith(')') || line.startsWith(']')) {
      if (bracketStack.length) {
        indentLevel = Math.max(0, indentLevel - 1);
        bracketStack.pop();
      }
      break;
    }

    // Add the line with proper indentation
    const indent = ' '.repeat(rules.indentSize * indentLevel);
    result.push(indent + line);

    // Check for indent triggers
    if (rules.indentTriggers.some(trigger => line.includes(trigger))) {
      const openCount = (line.match(/{|\[|\(/g) || []).length;
      const closeCount = (line.match(/}|\]|\)/g) || []).length;
      if (openCount > closeCount) {
        indentLevel++;
        bracketStack.push(line[line.length - 1]);
      }
    }
  }

  return result.join(config.newline);
};

const tokenizeCode = (code: string): string[] => {
  // Split code into tokens while preserving strings and comments
  const regex = /(['"`])((?:\\.|[^\\])*?)\1|\/\/.*|\/\*[\s\S]*?\*\/|\S+/g;
  return (code.match(regex) || []).map(token => token.trim()).filter(Boolean);
};

export const formatCodeWithLanguage = (code: string, language: string): string => {
  try {
    switch (language.toLowerCase()) {
      case 'python':
        return formatCode(code, 'python', { indent: '    ', newline: '\n' });
      case 'go':
        return formatCode(code, 'go', { indent: '\t', newline: '\n' });
      default:
        return formatCode(code, 'javascript', defaultConfig);
    }
  } catch (error) {
    console.error('Formatting failed:', error);
    return code;
  }
};
