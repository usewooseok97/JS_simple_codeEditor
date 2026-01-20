      const $codeInput = document.getElementById("code-input");
      const $submitButton = document.querySelector(".submit-button");
      const $downloadBtn = document.getElementById("download-btn");
      const $splitModeCheckbox = document.getElementById("split-mode-checkbox");
      const $strictModeCheckbox = document.getElementById("strict-mode-checkbox");

      const $returnView = document.getElementById("return-value");
      const $consoleView = document.getElementById("console-value");
      const $historyList = document.getElementById("history-list");

      const historyData = [];

      // 출력 포맷팅 함수
      const formatOutput = (value) => {
        if (typeof value === 'object' && value !== null) {
          try {
            return JSON.stringify(value, null, 2);
          } catch (e) {
            return String(value); // 순환 참조 등 예외 처리
          }
        }
        if (typeof value === 'function') {
          return value.toString();
        }
        if (value === undefined) {
          return 'undefined';
        }
        return String(value);
      };

      const resolveFunction = (value) => {
        let finalValue = value;
        try {
          // 함수가 인자 없이 호출 가능한 경우, 최종 값을 얻기 위해 반복적으로 호출
          while (typeof finalValue === 'function' && finalValue.length === 0) {
            finalValue = finalValue();
          }
        } catch (error) {
            // 함수 실행 중 에러가 발생하면 에러 메시지 반환
            return `Error during function execution: ${error.message}`;
        }
        return finalValue;
      };

      // 개별 코드 실행 함수
      const executeLine = (codeLine, isStrict) => {
        if (!codeLine.trim()) return "";
        const finalCode = isStrict ? `'use strict';\n${codeLine}` : codeLine;
        try {
          return new Function("return " + finalCode)();
        } catch (e) {
          try {
            return new Function(finalCode)();
          } catch (error) {
            let errorMessage = `Error: ${error.message}`;
            if (error instanceof SyntaxError && finalCode.trim().startsWith('<')) {
              errorMessage = 'HTML 태그는 문자열로 처리해야 합니다. 따옴표로 감싸보세요.';
            }
            return errorMessage;
          }
        }
      };
      
      $codeInput.addEventListener('keydown', function(e) {
        if (e.key == 'Tab') {
          e.preventDefault();
          var start = this.selectionStart;
          var end = this.selectionEnd;

          // set textarea value to: text before caret + tab + text after caret
          this.value = this.value.substring(0, start) +
            "\t" + this.value.substring(end);

          // put caret at right position again
          this.selectionStart =
            this.selectionEnd = start + 1;
        }
      });

      $submitButton.addEventListener("click", (e) => {
        e.preventDefault();
        let code = $codeInput.value;
        if (!code) return;
        
        const isStrict = $strictModeCheckbox.checked;
        if (isStrict) {
          code = `'use strict';\n${code}`;
        }

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
            const lines = code.split(';').filter(line => line.trim() !== "");
            lines.forEach(line => {
              // 개별 실행에서는 strict 모드 여부만 전달하고, 'use strict'는 executeLine에서 처리
              let result = executeLine(line, isStrict);
              result = resolveFunction(result);
              returnResults.push(formatOutput(result));
            });
          } else {
            // [모드 2] 통합 실행 (전체 스크립트)
            try {
              // 통합 실행에서는 이미 코드 상단에 'use strict'가 추가됨
              let result = new Function(code)();
              result = resolveFunction(result);
              returnResults.push(formatOutput(result));
            } catch (e) {
              throw e;
            }
          }
        } catch (err) {
          globalError = true;
          let errorMessage = `Error: ${err.message}`;
            if (err instanceof SyntaxError && code.trim().startsWith('<')) {
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
        addHistoryItem(code, finalReturnOutput, finalConsoleOutput, globalError, isSplitMode, isStrict);
      });

      // 히스토리 아이템 추가
      function addHistoryItem(code, returnVal, consoleVal, isError, isSplitMode, isStrict) {
        let modeText = isSplitMode
          ? "개별 실행 모드"
          : "통합 실행 모드";
        if(isStrict) modeText += " (Strict)";


        // 1. DOM 추가
        const li = document.createElement("li");
        li.className = "history-item";
        li.innerHTML = `
          <div class="history-code">${escapeHtml(code)}</div>
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

        let fileContent = "=== JavaScript Execution History ===\n\n";
        
        historyData.forEach((item, index) => {
          fileContent += `[Record #${historyData.length - index} | ${item.timestamp}]\n`;
          fileContent += `--- Execution Mode ---\n${item.mode}\n`;
          fileContent += `--- Input Code ---\n${item.code}\n`;
          fileContent += `--- Return Values ---\n${item.returnValue}\n`;
          fileContent += `--- Console Output ---\n${item.consoleValue || "(no log)"}\n`;
          fileContent += `\n====================================\n\n`;
        });

        const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `js_history_${new Date().toISOString().slice(0,10)}.txt`;
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