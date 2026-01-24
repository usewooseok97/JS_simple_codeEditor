      const $codeInput = document.getElementById("code-input");
      const $submitButton = document.querySelector(".submit-button");
      const $downloadBtn = document.getElementById("download-btn");
      const $splitModeCheckbox = document.getElementById("split-mode-checkbox");
      const $strictModeCheckbox = document.getElementById("strict-mode-checkbox");

      const $returnView = document.getElementById("return-value");
      const $consoleView = document.getElementById("console-value");
      const $historyList = document.getElementById("history-list");

      const historyData = [];

      // [추가] CodeMirror 에디터 적용
      const editor = CodeMirror.fromTextArea($codeInput, {
        mode: "javascript",       // 언어 설정
        theme: "dracula",         // 테마 설정 (index.html에 추가한 테마와 일치해야 함)
        lineNumbers: true,        // 줄 번호 표시
        tabSize: 2,               // 탭 크기
        lineWrapping: true,       // 줄바꿈 자동
        viewportMargin: Infinity,  // 내용에 맞춰 높이 조절 (선택사항)
        placeholder: "let a = 10; console.log(a);"
      });

      // 출력 포맷팅 함수
      const formatOutput = (value) => {
        if (value === undefined) {
          return 'undefined';
        }
        if (value === null) {
          return 'null';
        }
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value, null, 2);
          } catch (e) {
            return String(value); // 순환 참조 등 예외 처리
          }
        }
        if (typeof value === 'function') {
          return value.toString();
        }
        return String(value);
      };

      // 개별 코드 실행 함수
      const executeLine = (codeLine, isStrict) => {
        if (!codeLine.trim()) return "";
        
        const strictPragma = isStrict ? "'use strict';\n" : "";

        try {
          // Try to execute as an expression that returns a value.
          return new Function(strictPragma + "return " + codeLine)();
        } catch (e) {
          try {
            // If it fails, try to execute as a statement.
            return new Function(strictPragma + codeLine)();
          } catch (error) {
            let errorMessage = `Error: ${error.message}`;
            if (error instanceof SyntaxError && codeLine.trim().startsWith('<')) {
              errorMessage = 'HTML 태그는 문자열로 처리해야 합니다. 따옴표로 감싸보세요.';
            }
            return errorMessage;
          }
        }
      };

      // 26.01.23이후 사용안함
      // $codeInput.addEventListener('keydown', function(e) {
      //   if (e.key == 'Tab') {
      //     e.preventDefault();
      //     var start = this.selectionStart;
      //     var end = this.selectionEnd;

      //     // set textarea value to: text before caret + tab + text after caret
      //     this.value = this.value.substring(0, start) +
      //       "\t" + this.value.substring(end);

      //     // put caret at right position again
      //     this.selectionStart =
      //       this.selectionEnd = start + 1;
      //   }
      // });

      $submitButton.addEventListener("click", (e) => {
        e.preventDefault();
        // const originalCode = $codeInput.value;
        const originalCode = editor.getValue();
        if (!originalCode) return;
        
        const isStrict = $strictModeCheckbox.checked;
        
        const logBuffer = [];
        const originalLog = console.log;
        console.log = (...args) => {
          const message = args.map(arg => formatOutput(arg)).join(' ');
          logBuffer.push(message);
        };

        const returnResults = [];
        let globalError = false;
        const isSplitMode = $splitModeCheckbox.checked;

        try {
          if (isSplitMode) {
            // [모드 1] 개별 실행 (세미콜론 기준)
            const lines = originalCode.split(';').filter(line => line.trim() !== "");
            lines.forEach(line => {
              let result = executeLine(line, isStrict);
              returnResults.push(formatOutput(result));
            });
          } else {
            // [모드 2] 통합 실행 (전체 스크립트)
            try {
                const executionCode = isStrict ? `'use strict';\n${originalCode}` : originalCode;
                let result = new Function(executionCode)();
                returnResults.push(formatOutput(result));
            } catch (e) {
                // 통합 실행 중 발생한 모든 에러는 여기서 처리됩니다.
                throw e;
            }
          }
        } catch (err) {
          globalError = true;
          let errorMessage = `Error: ${err.message}`;
            if (err instanceof SyntaxError && originalCode.trim().startsWith('<')) {
              errorMessage = 'HTML 태그는 문자열로 처리해야 합니다. 따옴표로 감싸보세요.';
            }
          returnResults.push(errorMessage);
        } finally {
          console.log = originalLog;
        }

        const finalReturnOutput = returnResults.join('\n');
        const finalConsoleOutput = logBuffer.length > 0 ? logBuffer.join('\n') : "";

        $returnView.textContent = finalReturnOutput;
        $consoleView.textContent = finalConsoleOutput;

        // 히스토리 추가 (모드 정보 전달)
        addHistoryItem(originalCode, finalReturnOutput, finalConsoleOutput, globalError, isSplitMode, isStrict);
      });

      // 히스토리 아이템 추가
      function addHistoryItem(code, returnVal, consoleVal, isError, isSplitMode, isStrict) {
        let modeText = isSplitMode
          ? "개별 실행 모드"
          : "통합 실행 모드";
        if(isStrict) modeText += " (Strict)";

        // Prism.highlight(코드문자열, 언어정의, 언어이름)
        const highlightedCode = Prism.highlight(code, Prism.languages.javascript, 'javascript');

        // 1. DOM 추가
        const li = document.createElement("li");
        li.className = "history-item";
        // 26.01.23이후로 사용안함
        // li.innerHTML = `
        //   <div class="history-code">${escapeHtml(code)}</div>
        //   <div class="history-output">
        //     <div class="history-column">
        //       <span class="history-label">Return Values</span>
        //       <span style="white-space: pre-wrap; color: ${isError ? 'var(--error-color)' : 'var(--primary-color)'};">${escapeHtml(returnVal)}</span>
        //     </div>
        //     <div class="history-column">
        //       <span class="history-label">Console Output</span>
        //       <span style="white-space: pre-wrap;">${escapeHtml(consoleVal)}</span>
        //     </div>
        //   </div>
        //   <div class="history-mode-badge">${modeText}</div>
        // `;
        // pre 태그와 code 태그로 감싸야 Prism 스타일이 제대로 먹힙니다.

        li.innerHTML = `
          <div class="history-code">
            <pre style="margin:0; background:transparent;"><code class="language-javascript">${highlightedCode}</code></pre>
          </div>
          <div class="history-output">
            <div class="history-column">
              <span class="history-label">Return Values</span>
              <span style="white-space: pre-wrap; color: ${isError ? 'var(--error-color)' : 'var(--primary-color)'};">${escapeHtml(returnVal)}</span>
            </div>
            <div class="history-column">
              <span class="history-label">Console Output</span>
              <span style="white-space: pre-wrap;">${escapeHtml(consoleVal)}</span>
            </div>
          </div>
          <div class="history-mode-badge">${modeText}</div>
        `;

        $historyList.prepend(li);

        // 2. 데이터 저장
        historyData.unshift({
          timestamp: new Date().toLocaleString(),
          code: code,
          returnValue: returnVal,
          consoleValue: consoleVal,
          mode: modeText
        });
      }

      // 파일 다운로드
      $downloadBtn.addEventListener("click", () => {
        if (historyData.length === 0) {
          alert("저장된 히스토리가 없습니다.");
          return;
        }

        let fileContent = `
          <!DOCTYPE html>
          <html lang="ko">
          <head>
            <meta charset="UTF-8">
            <title>JS Runner History</title>
            <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-vsc-dark-plus.min.css" rel="stylesheet" />
            <style>
              body { font-family: sans-serif; padding: 20px; background: #f0f0f0; }
              .record { background: #fff; padding: 15px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #ddd; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
              .meta { font-size: 0.9em; color: #666; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
              .label { font-weight: bold; display: block; margin-top: 10px; color: #333; }
              pre { border-radius: 5px; margin: 5px 0; }
              .output { background: #f9f9f9; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-family: monospace; border: 1px solid #eee; }
            </style>
          </head>
          <body>
            <h1>JavaScript Execution History</h1>
          `;
        
          // 히스토리 데이터 루프
          historyData.forEach((item, index) => {
            // 저장할 때도 코드를 하이라이팅 처리해서 HTML로 변환
            const highlightedCode = Prism.highlight(item.code, Prism.languages.javascript, 'javascript');
            
            fileContent += `
            <div class="record">
              <div class="meta">
                <strong>Record #${historyData.length - index}</strong> | ${item.timestamp} | ${item.mode}
              </div>
              
              <span class="label">Code:</span>
              <pre><code class="language-javascript">${highlightedCode}</code></pre>
              
              <span class="label">Return Value:</span>
              <div class="output">${escapeHtml(item.returnValue)}</div>
              
              <span class="label">Console Output:</span>
              <div class="output">${escapeHtml(item.consoleValue || "(no log)")}</div>
            </div>
            `;
          });

          fileContent += `</body></html>`;

        const blob = new Blob([fileContent], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `js_history_${new Date().toISOString().slice(0,10)}.html`;
        a.click();
        URL.revokeObjectURL(url);
      });

      function escapeHtml(text) {
        if (!text) return text;
        return text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

// Mermaid 초기화
mermaid.initialize({ startOnLoad: true });

const $analyzeBtn = document.getElementById("analyze-btn");
const $aiExplanation = document.getElementById("ai-explanation");
const $mermaidView = document.getElementById("mermaid-view");

$analyzeBtn.addEventListener("click", async () => {
    // 에디터에서 코드 가져오기 (CodeMirror 사용 시 editor.getValue())
    const code = editor.getValue(); 

    if (!code.trim()) {
        alert("분석할 코드를 입력해주세요.");
        return;
    }

    // UI 로딩 상태로 변경
    $analyzeBtn.disabled = true;
    $aiExplanation.textContent = "AI가 코드를 분석하고 있습니다... 🧠";
    $mermaidView.innerHTML = "Loading...";

    try {
        // [변경] 내 서버(api/analyze.js)로 요청 전송
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: JSON.stringify({ code: code }) // 코드만 보냄 (프롬프트는 서버에 있음)
        });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }

        const result = await response.json();

        // [보안] 1. XSS 방지 (텍스트 컨텐츠 처리)
        $aiExplanation.textContent = result.explanation;

        // [보안] 2. Mermaid 차트 소독 후 렌더링
        const cleanChart = DOMPurify.sanitize(result.chart);
        $mermaidView.innerHTML = cleanChart;
        $mermaidView.removeAttribute("data-processed"); // 재렌더링을 위해 속성 제거
        
        await mermaid.run({ nodes: [$mermaidView] });

    } catch (error) {
        console.error(error);
        $aiExplanation.textContent = "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
        $mermaidView.innerHTML = "Error";
    } finally {
        $analyzeBtn.disabled = false;
    }
});