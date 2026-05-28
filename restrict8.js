// Execute immediately to prevent the original page content from flashing
(function() {
    const targetUA = "EduZod/1.0";
    
    // IF the user agent does NOT contain the allowed string
    if (!navigator.userAgent.includes(targetUA)) {
        // Stop the browser from loading and rendering the rest of the original page
        window.stop(); 
        
        // Overwrite the entire document with the Telegram download notice
        document.documentElement.innerHTML = `
            <head>
                <title>Access Restricted</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        background-color: #f5f7fb;
                        color: #333;
                        text-align: center;
                    }
                    .container {
                        padding: 30px;
                        border-radius: 12px;
                        background: #ffffff;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                        max-width: 400px;
                        width: 90%;
                    }
                    h1 {
                        font-size: 1.5rem;
                        margin-bottom: 20px;
                        color: #222;
                    }
                    .btn-tg {
                        display: inline-block;
                        padding: 12px 24px;
                        background-color: #0088cc;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: bold;
                        transition: background-color 0.2s ease;
                    }
                    .btn-tg:hover {
                        background-color: #0077b3;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Join TG to download our app</h1>
                    <a href="https://t.me/eduzod" class="btn-tg" target="_blank" rel="noopener noreferrer">
                        Join Telegram
                    </a>
                </div>
            </body>
        `;
    }
})();
