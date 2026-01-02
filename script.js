      const $codeInput = document.getElementById("code-input");
      const $submitButton = document.querySelector(".submit-button");
      const $downloadBtn = document.getElementById("download-btn");
      const $splitModeCheckbox = document.getElementById("split-mode-checkbox");
      
      const $returnView = document.getElementById("return-value");
      const $consoleView = document.getElementById("console-value");
      const $historyList = document.getElementById("history-list");

      const historyData = [];

      // 개별 코드 실행 함수
      const executeLine = (codeLine) => {
        if (!codeLine.trim()) return "";
        try {
          return new Function("return " + codeLine)();
        } catch (e) {
          try {
            const result = new Function(codeLine)();
            return result === undefined ? "undefined" : result;
          } catch (error) {
            return "Error";
          }
        }
      };

      $submitButton.addEventListener("click", (e) => {
        e.preventDefault();
        const code = $codeInput.value;
        if (!code) return;

        const logBuffer = [];
        const originalLog = console.log;
        console.log = (...args) => {
          const message = args.map(arg => String(arg)).join(' ');
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
              const result = executeLine(line);
              returnResults.push(String(result));
            });
          } else {
            // [모드 2] 통합 실행 (전체 스크립트)
            try {
              const result = new Function(code)();
              returnResults.push(String(result));
            } catch (e) {
              throw e;
            }
          }
        } catch (err) {
          globalError = true;
          returnResults.push("Error: " + err.message);
        } finally {
          console.log = originalLog;
        }

        const finalReturnOutput = returnResults.join('\n');
        const finalConsoleOutput = logBuffer.length > 0 ? logBuffer.join('\n') : "";

        $returnView.textContent = finalReturnOutput;
        $consoleView.textContent = finalConsoleOutput;

        // 히스토리 추가 (모드 정보 전달)
        addHistoryItem(code, finalReturnOutput, finalConsoleOutput, globalError, isSplitMode);
      });

      // 히스토리 아이템 추가
      function addHistoryItem(code, returnVal, consoleVal, isError, isSplitMode) {
        const modeText = isSplitMode
          ? "☑️ 개별 실행 모드 (Split by ;)"
          : "🟩 통합 실행 모드 (Script Block)";

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