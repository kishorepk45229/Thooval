$(document).ready(function() {
    const $editor = $('#editor');
    const DRAFT_KEY = 'malayalam_draft_content';
    const THEME_KEY = 'app_theme_preference';

    // --- 1. Initialization & State ---
    
    // Load saved text
    if (localStorage.getItem(DRAFT_KEY)) {
        $editor.val(localStorage.getItem(DRAFT_KEY));
        updateCharCount();
    }

    // Load theme
    if (localStorage.getItem(THEME_KEY) === 'dark') {
        $('body').attr('data-theme', 'dark');
        $('#btn-theme').text('☀️');
    }

    // --- 2. Transliteration Engine (Manglish to Malayalam) ---
    
    // Listen for Space or Enter key
    $editor.on('keyup', function(e) {
        updateCharCount();
        saveDraft();

        if (e.key === ' ' || e.key === 'Enter') {
            processTransliteration(this);
        }
    });

    function processTransliteration(textarea) {
        let text = textarea.value;
        let cursorPos = textarea.selectionStart;

        // Find the last word typed before the cursor
        let textBeforeCursor = text.substring(0, cursorPos);
        
        // Match the last English word (letters only) before the space/enter
        let match = textBeforeCursor.match(/([a-zA-Z]+)([\s\n]*)$/);

        if (match) {
            let englishWord = match[1];
            let trailingSpace = match[2];
            let wordStartPos = match.index;

            // Call Google Input Tools API for Malayalam (ml-t-i0-und)
            let apiUrl = `https://inputtools.google.com/request?text=${englishWord}&itc=ml-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;

            $.get(apiUrl, function(response) {
                if (response[0] === 'SUCCESS' && response[1][0][1].length > 0) {
                    let malayalamWord = response[1][0][1][0]; // Get top suggestion

                    // Reconstruct the text
                    let newTextBeforeCursor = textBeforeCursor.substring(0, wordStartPos) + malayalamWord + trailingSpace;
                    
                    textarea.value = newTextBeforeCursor + text.substring(cursorPos);
                    
                    // Restore cursor position to exactly after the newly inserted word and space
                    let newCursorPos = newTextBeforeCursor.length;
                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                    
                    saveDraft();
                }
            }).fail(function() {
                console.error("Transliteration API failed.");
            });
        }
    }

    // --- 3. UI Features & Utilities ---

    // Dark Mode Toggle
    $('#btn-theme').on('click', function() {
        let $body = $('body');
        if ($body.attr('data-theme') === 'dark') {
            $body.removeAttr('data-theme');
            $(this).text('🌙');
            localStorage.setItem(THEME_KEY, 'light');
        } else {
            $body.attr('data-theme', 'dark');
            $(this).text('☀️');
            localStorage.setItem(THEME_KEY, 'dark');
        }
    });

    // Copy Text
    $('#btn-copy').on('click', function() {
        const text = $editor.val();
        if(!text) return;

        navigator.clipboard.writeText(text).then(() => {
            let $btn = $(this);
            let originalHtml = $btn.html();
            $btn.html('<span class="icon">✅</span> Copied!');
            setTimeout(() => $btn.html(originalHtml), 2000);
        });
    });

    // Clear Canvas
    $('#btn-clear').on('click', function() {
        if(confirm("Are you sure you want to clear the canvas?")) {
            $editor.val('');
            saveDraft();
            updateCharCount();
        }
    });

    // --- 4. Voice Typing (Web Speech API) ---
    let recognition;
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.lang = 'ml-IN'; // Malayalam
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = function() {
            $('#btn-voice').addClass('active').html('<span class="icon">🛑</span> Stop');
        };

        recognition.onresult = function(event) {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if(finalTranscript) {
                let currentVal = $editor.val();
                $editor.val(currentVal + (currentVal.endsWith(' ') ? '' : ' ') + finalTranscript + ' ');
                updateCharCount();
                saveDraft();
            }
        };

        recognition.onerror = function(event) {
            console.error("Speech recognition error", event.error);
        };

        recognition.onend = function() {
            $('#btn-voice').removeClass('active').html('<span class="icon">🎤</span> Voice');
        };
    } else {
        $('#btn-voice').hide(); // Hide if browser doesn't support it
    }

    $('#btn-voice').on('click', function() {
        if (!recognition) return;
        if ($(this).hasClass('active')) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    // --- Helpers ---
    function saveDraft() {
        localStorage.setItem(DRAFT_KEY, $editor.val());
        $('#save-status').text('Saved just now').stop(true, true).fadeIn().delay(2000).fadeOut('slow', function() {
            $(this).text('All changes saved locally').fadeIn('slow');
        });
    }

    function updateCharCount() {
        let length = $editor.val().length;
        $('#char-count').text(length + ' characters');
    }
});