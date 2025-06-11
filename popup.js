async function getSecrets() {
    const response = await fetch(chrome.runtime.getURL("secrets.json"));
    return await response.json();  // returns { API_KEY: ..., API_URL: ... }
}

document.addEventListener("DOMContentLoaded", async () => {
    const outputDiv = document.getElementById("output");
    const { API_KEY, API_URL } = await getSecrets();

    // Getting the current tab's URL
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const url = tabs[0].url;

        // Checking if the URL is a valid YouTube URL
        const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
        const match = url.match(youtubeRegex);

        if (match && match[1]) {
            const videoID = match[1];
            outputDiv.textContent = `YouTube Video ID: ${videoID}\nFetching comments...`;

            // Fetch comments using the YouTube Data API
            const comments = await fetchComments(videoID);
            if (comments.length === 0) {
                outputDiv.textContent += "\nNo comments found on this video.";
                return;
            }

            outputDiv.textContent += `\nFetched ${comments.length} comments. Sending them for sentiment analysis...`;

            // Sending comments to FastAPI for sentiment prediction
            const predictions = await getSentimentPredictions(comments);

            // Calculating and displaying sentiment distribution
            if (predictions) {
                const sentimentCounts = {"1": 0, "0": 0, "2": 0};
                predictions.forEach(prediction => {
                    sentimentCounts[prediction]++;
                });

                const total = predictions.length;
                const positivePercent = ((sentimentCounts["1"] / total) * 100).toFixed(2);
                const neutralPercent = ((sentimentCounts["0"] / total) * 100).toFixed(2);
                const negativePercent = ((sentimentCounts["2"] / total) * 100).toFixed(2);

                outputDiv.textContent += `\n\nSentiment Analysis Results:\nPositive: ${positivePercent}%\nNeutral: ${neutralPercent}%\nNegative: ${negativePercent}%`;
            }
        } else {
            outputDiv.textContent = "This is not a valid YouTube URL";
        }
    });

    // Function to fetch all comments on a video
    async function fetchComments(videoID) {
        let comments = [];
        let pageToken = "";
        try {
            while (comments.length <= 100) {  // Limit to 100 comments
                const response = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoID}&key=${API_KEY}&maxResults=100&pageToken=${pageToken}`);
                const data = await response.json();
                data.items.forEach(item => {
                    comments.push(item.snippet.topLevelComment.snippet.textOriginal);
                });
                pageToken = data.nextPageToken;
                if (!pageToken) break;
            }
        } catch (error) {
            console.error("Error fetching comments:", error);
        }
        return comments;
    }

    // Function to get sentiment predictions from FastAPI
    async function getSentimentPredictions(comments) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ comments })
            });
            const result = await response.json();
            return result.map(item => item.sentiment);  // Extract only sentiment values
        } catch (error) {
            console.error("Error fetching predictions:", error);
            outputDiv.textContent += "\nError fetching sentiment predictions.";
            return null;
        }
    }
});