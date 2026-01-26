// Web Worker for safe code execution with timeout protection
self.onmessage = function(e) {
    const { code, isStrict, isSplitMode } = e.data;
    const logs = [];

    // console.log 캡처
    console.log = (...args) => {
        const message = args.map(arg => {
            if (arg === undefined) return 'undefined';
            if (arg === null) return 'null';
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            if (typeof arg === 'function') return arg.toString();
            return String(arg);
        }).join(' ');
        logs.push(message);
    };

    // 출력 포맷팅 함수
    const formatOutput = (value) => {
        if (value === undefined) return 'undefined';
        if (value === null) return 'null';
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, null, 2);
            } catch (e) {
                return String(value);
            }
        }
        if (typeof value === 'function') return value.toString();
        return String(value);
    };

    // 개별 코드 실행 함수
    const executeLine = (codeLine, isStrict) => {
        if (!codeLine.trim()) return "";
        const strictPragma = isStrict ? "'use strict';\n" : "";

        try {
            return new Function(strictPragma + "return " + codeLine)();
        } catch (e) {
            try {
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

    const returnResults = [];
    let globalError = false;

    try {
        if (isSplitMode) {
            // [모드 1] 개별 실행 (세미콜론 기준)
            const lines = code.split(';').filter(line => line.trim() !== "");
            lines.forEach(line => {
                let result = executeLine(line, isStrict);
                returnResults.push(formatOutput(result));
            });
        } else {
            // [모드 2] 통합 실행 (전체 스크립트)
            const executionCode = isStrict ? `'use strict';\n${code}` : code;
            let result = new Function(executionCode)();
            returnResults.push(formatOutput(result));
        }

        self.postMessage({
            success: true,
            returnResults: returnResults,
            logs: logs,
            globalError: false
        });

    } catch (err) {
        globalError = true;
        let errorMessage = `Error: ${err.message}`;
        if (err instanceof SyntaxError && code.trim().startsWith('<')) {
            errorMessage = 'HTML 태그는 문자열로 처리해야 합니다. 따옴표로 감싸보세요.';
        }
        returnResults.push(errorMessage);

        self.postMessage({
            success: false,
            returnResults: returnResults,
            logs: logs,
            globalError: true,
            error: errorMessage
        });
    }
};
