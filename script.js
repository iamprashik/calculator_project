const resultEl = document.getElementById('result');
  const expressionEl = document.getElementById('expression');
  const clearBtn = document.getElementById('clearBtn');
  const allOpButtons = document.querySelectorAll('.op[data-action]');
 
  let current = '0';
  let expressionParts = []; // alternating: [num, op, num, op, ...]
  let overwrite = true;
  let expressionText = '';
  let resultShown = false;
  let autoMultiplyPending = false;
 
  function formatNumber(numStr) {
    if (numStr === 'Error') return numStr;
    const [intPart, decPart] = numStr.split('.');
    const negative = intPart.startsWith('-');
    const intDigits = negative ? intPart.slice(1) : intPart;
    const withCommas = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    let out = (negative ? '-' : '') + withCommas;
    if (decPart !== undefined) out += '.' + decPart;
    return out;
  }
 
  function formatOperand(numStr) {
    const formatted = formatNumber(numStr);
    return formatted.startsWith('-') ? '(' + formatted + ')' : formatted;
  }
 
  function liveExpression() {
    if (expressionParts.length === 0) return formatOperand(current);
    let text = expressionParts
      .map((tok, idx) => (idx % 2 === 0 ? formatOperand(tok) : opSymbol(tok)))
      .join(' ');
    if (!overwrite) text += ' ' + formatOperand(current);
    return text;
  }
 
  function updateDisplay() {
    if (resultShown) {
      resultEl.textContent = formatNumber(current);
      expressionEl.textContent = expressionText || '\u00A0';
    } else {
      resultEl.textContent = liveExpression();
      expressionEl.textContent = '\u00A0';
    }
    // shrink font for long numbers/expressions
    const len = resultEl.textContent.length;
    if (len > 9) {
      resultEl.style.fontSize = Math.max(26, 62 - (len - 9) * 3) + 'px';
    } else {
      resultEl.style.fontSize = '';
    }
    clearBtn.textContent = overwrite ? 'AC' : 'C';
  }
 
  function opSymbol(action) {
    return { add: '+', subtract: '−', multiply: '×', divide: '÷' }[action];
  }
 
  function clearActiveOps() {
    allOpButtons.forEach(b => b.classList.remove('active'));
  }
 
  function highlightOp(action) {
    clearActiveOps();
    const btn = document.querySelector(`.op[data-action="${action}"]`);
    if (btn) {
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 150);
    }
  }
 
  function inputNumber(num) {
    if (current === 'Error') { current = '0'; }
    if (autoMultiplyPending) {
      expressionParts.push(current, 'multiply');
      overwrite = true;
      resultShown = false;
      autoMultiplyPending = false;
      highlightOp('multiply');
    }
    if (overwrite) {
      if (expressionParts.length === 0) resultShown = false;
      current = num === '.' ? '0.' : num;
      overwrite = false;
    } else {
      if (num === '.') {
        if (!current.includes('.')) current += '.';
      } else {
        if (current === '0') current = num;
        else current += num;
      }
    }
    updateDisplay();
  }
 
  function inputDecimal() {
    inputNumber('.');
  }
 
  function toggleSign() {
    if (current === 'Error') return;
    if (resultShown) {
      expressionText = '';
      resultShown = false;
      expressionParts = [];
    }
    if (current !== '0') {
      current = current.startsWith('-') ? current.slice(1) : '-' + current;
    }
    overwrite = false;
    if (expressionParts.length === 0) {
      autoMultiplyPending = true;
    }
    updateDisplay();
  }
 
  function inputPercent() {
    if (current === 'Error') return;
    current = String(parseFloat(current) / 100);
    updateDisplay();
  }
 
  function compute(a, b, op) {
    const x = parseFloat(a), y = parseFloat(b);
    switch (op) {
      case 'add': return x + y;
      case 'subtract': return x - y;
      case 'multiply': return x * y;
      case 'divide': return y === 0 ? NaN : x / y;
      default: return y;
    }
  }
 
  function trimResult(num) {
    if (isNaN(num) || !isFinite(num)) return 'Error';
    let str = String(num);
    if (str.includes('e')) {
      str = num.toPrecision(10).replace(/\.?0+$/, '');
    } else if (str.includes('.') && str.length > 12) {
      str = num.toFixed(Math.max(0, 10 - str.split('.')[0].length)).replace(/\.?0+$/, '');
    }
    return str;
  }
 
  function handleOperator(action) {
    if (current === 'Error') return;
    autoMultiplyPending = false;
    if (overwrite && expressionParts.length > 0) {
      // no new operand typed since last operator - just swap it
      expressionParts[expressionParts.length - 1] = action;
    } else {
      expressionParts.push(current, action);
      overwrite = true;
    }
    resultShown = false;
    highlightOp(action);
    updateDisplay();
  }
 
  function evaluateWithPrecedence(fullParts) {
    // Pass 1: resolve all × and ÷ first, collapsing them into their neighbors
    let terms = [parseFloat(fullParts[0])];
    let ops = [];
    for (let i = 1; i < fullParts.length; i += 2) {
      const op = fullParts[i];
      const val = parseFloat(fullParts[i + 1]);
      if (op === 'multiply' || op === 'divide') {
        const last = terms.pop();
        terms.push(compute(String(last), String(val), op));
      } else {
        terms.push(val);
        ops.push(op);
      }
    }
    // Pass 2: resolve remaining + and − left to right
    let acc = terms[0];
    for (let i = 0; i < ops.length; i++) {
      acc = compute(String(acc), String(terms[i + 1]), ops[i]);
    }
    return acc;
  }
 
  function handleEquals() {
    if (expressionParts.length === 0 || current === 'Error') return;
    clearActiveOps();
    autoMultiplyPending = false;
    const fullParts = expressionParts.concat([current]);
    const acc = evaluateWithPrecedence(fullParts);
    const errored = isNaN(acc) || !isFinite(acc);
    expressionText = fullParts
      .map((tok, idx) => (idx % 2 === 0 ? formatOperand(tok) : opSymbol(tok)))
      .join(' ');
    current = errored ? 'Error' : trimResult(acc);
    expressionParts = [];
    overwrite = true;
    resultShown = true;
    updateDisplay();
  }
 
  function deleteLast() {
    autoMultiplyPending = false;
    if (current === 'Error') {
      current = '0';
      overwrite = true;
      updateDisplay();
      return;
    }
    if (overwrite) {
      // nothing typed for the current operand yet - undo the last operator instead
      if (expressionParts.length >= 2) {
        expressionParts.pop(); // operator
        current = expressionParts.pop(); // previous number becomes editable again
        overwrite = false;
        clearActiveOps();
      } else {
        current = '0';
      }
      updateDisplay();
      return;
    }
    if (current.length <= 1 || (current.length === 2 && current.startsWith('-'))) {
      current = '0';
      overwrite = true;
    } else {
      current = current.slice(0, -1);
    }
    updateDisplay();
  }
 
  function clearAll() {
    current = '0';
    expressionParts = [];
    overwrite = true;
    expressionText = '';
    resultShown = false;
    autoMultiplyPending = false;
    clearActiveOps();
    updateDisplay();
  }
 
  function handleClear() {
    if (clearBtn.textContent === 'C') {
      current = '0';
      overwrite = true;
      autoMultiplyPending = false;
      updateDisplay();
    } else {
      clearAll();
    }
  }
 
  document.querySelectorAll('[data-num]').forEach(btn => {
    btn.addEventListener('click', () => inputNumber(btn.dataset.num));
  });
 
  document.querySelector('[data-action="decimal"]').addEventListener('click', inputDecimal);
  document.querySelector('[data-action="sign"]').addEventListener('click', toggleSign);
  document.querySelector('[data-action="percent"]').addEventListener('click', inputPercent);
  document.querySelector('[data-action="clear"]').addEventListener('click', handleClear);
  document.querySelector('[data-action="backspace"]').addEventListener('click', deleteLast);
  document.querySelector('[data-action="equals"]').addEventListener('click', handleEquals);
 
  ['add', 'subtract', 'multiply', 'divide'].forEach(action => {
    document.querySelector(`[data-action="${action}"]`).addEventListener('click', () => handleOperator(action));
  });
 
  // Keyboard support
  window.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') inputNumber(e.key);
    else if (e.key === '.') inputDecimal();
    else if (e.key === '+') handleOperator('add');
    else if (e.key === '-') handleOperator('subtract');
    else if (e.key === '*') handleOperator('multiply');
    else if (e.key === '/') { e.preventDefault(); handleOperator('divide'); }
    else if (e.key === 'Enter' || e.key === '=') handleEquals();
    else if (e.key === 'Escape') clearAll();
    else if (e.key === 'Backspace') deleteLast();
    else if (e.key === '%') inputPercent();
  });
 
  updateDisplay();