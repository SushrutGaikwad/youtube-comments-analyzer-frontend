async function getApiKey() {
    const response = await fetch(chrome.runtime.getURL("secrets.json"));
    const data = await response.json();
    return data.API_KEY;
}

document.addEventListener("DOMContentLoaded", async () => {
    const outputDiv = document.getElementById("output");

    const API_KEY = await getApiKey();  // fetched here

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0].url;
        const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
        const match = url.match(youtubeRegex);

        if (match && match[1]) {
            const videoID = match[1];
            outputDiv.textContent = `YouTube Video ID: ${videoID}`;

            fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoID}&key=${API_KEY}`)
                .then(response => response.json())
                .then(data => {
                    if (data.items && data.items.length > 0) {
                        const commentCount = data.items[0].statistics.commentCount;
                        outputDiv.textContent += `\nTotal Comments: ${commentCount}`;
                    } else {
                        outputDiv.textContent += "\nNo data available for this video.";
                    }
                })
                .catch(error => {
                    console.error("Error fetching comment count:", error);
                    outputDiv.textContent += "\nError fetching comment count.";
                });
        } else {
            outputDiv.textContent = "This is not a valid YouTube URL";
        }
    });
});