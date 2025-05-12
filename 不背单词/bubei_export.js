// ==UserScript==
// @name         不背单词生词导出
// @namespace    http://tampermonkey.net/
// @version      2025.05.12
// @description  Export vocabulary list from 不背单词 (www.bbdc.cn)
// @homepage           https://github.com/cdpath/danci
// @homepageURL        https://github.com/cdpath/danci
// @supportURL         https://github.com/cdpath/danci/issues
// @author       cdpath
// @match        https://www.bbdc.cn/newword
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bbdc.cn
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Store collected words
    let collectedWords = new Set();
    let exportButton;

    // Create and add export button when DOM is ready
    function addExportButton() {
        exportButton = document.createElement('button');
        exportButton.textContent = '导出生词表';
        exportButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 10px 20px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        `;
        exportButton.addEventListener('click', exportToCsv);
        document.body.appendChild(exportButton);
        updateButtonStatus();
    }

    // Intercept XHR requests
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        const url = arguments[1];
        if (url.includes('/api/user-new-word')) {
            this.addEventListener('load', function() {
                try {
                    const response = JSON.parse(this.responseText);
                    if (response.data_body && response.data_body.wordList) {
                        response.data_body.wordList.forEach(word => {
                            collectedWords.add(JSON.stringify(word));
                        });
                        updateButtonStatus();
                    }
                } catch (error) {
                    console.error('Error parsing response:', error);
                }
            });
        }
        originalXHROpen.apply(this, arguments);
    };

    // Update button text with word count
    function updateButtonStatus() {
        if (exportButton) {
            exportButton.textContent = `导出生词表 (${collectedWords.size}词)`;
        }
    }

    // Export words to CSV
    function exportToCsv() {
        const words = Array.from(collectedWords).map(w => JSON.parse(w));
        const headers = ['word', 'ukpron', 'uspron', 'updatetime'];
        const csvContent = [
            headers.join(','),
            ...words.map(word =>
                headers.map(header =>
                    JSON.stringify(word[header] || '')
                ).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `bbdc_words_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Add export button when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addExportButton);
    } else {
        addExportButton();
    }
})();