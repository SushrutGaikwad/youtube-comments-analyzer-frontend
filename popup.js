document.addEventListener("DOMContentLoaded", async () => {
    const outputDiv = document.getElementById("output");

    // Get the current tab's URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0].url;

        // Check if the URL is a valid YouTube URL
        const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
        const match = url.match(youtubeRegex);

        if (match && match[1]) {
            const videoID = match[1];
            outputDiv.textContent = `YouTube Video ID: ${videoID}`;
        } else {
            outputDiv.textContent = "This is not a valid YouTube URL";
        }
    });
});