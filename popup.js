// Load secrets from secrets.json
async function getSecrets() {
  const response = await fetch(chrome.runtime.getURL("secrets.json"));
  return await response.json(); // { API_KEY, API_URL }
}

document.addEventListener("DOMContentLoaded", async () => {
  const outputDiv = document.getElementById("output");

  // Load API key and URL from secrets.json
  const { API_KEY, API_URL } = await getSecrets();

  // Get the current tab's URL
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const url = tabs[0].url;
    const youtubeRegex = /^https:\/\/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11})/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
      const videoId = match[1];
      outputDiv.innerHTML = `<div class="section-title">YouTube Video ID</div><p>${videoId}</p><p>Fetching comments...</p>`;

      const comments = await fetchComments(videoId, API_KEY);
      if (comments.length === 0) {
        outputDiv.innerHTML += "<p>No comments found for this video.</p>";
        return;
      }

      outputDiv.innerHTML += `<p>Fetched ${comments.length} comments. Sending for sentiment analysis...</p>`;
      const predictions = await getSentimentPredictions(comments, API_URL);

      if (predictions) {
        const sentimentCounts = { "1": 0, "0": 0, "2": 0 };
        predictions.forEach(prediction => sentimentCounts[prediction]++);
        const total = predictions.length;

        const positivePercent = ((sentimentCounts["1"] / total) * 100).toFixed(2);
        const neutralPercent = ((sentimentCounts["0"] / total) * 100).toFixed(2);
        const negativePercent = ((sentimentCounts["2"] / total) * 100).toFixed(2);

        outputDiv.innerHTML += `
          <div class="section">
            <div class="section-title">Sentiment Analysis Results</div>
            <div class="sentiment-boxes">
              <div class="sentiment-box">
                <div class="label">Positive</div>
                <div class="percentage">${positivePercent}%</div>
              </div>
              <div class="sentiment-box">
                <div class="label">Neutral</div>
                <div class="percentage">${neutralPercent}%</div>
              </div>
              <div class="sentiment-box">
                <div class="label">Negative</div>
                <div class="percentage">${negativePercent}%</div>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Top 25 Comments with Sentiments</div>
            <ul class="comment-list">
              ${comments.slice(0, 25).map((comment, index) => `
                <li class="comment-item">
                  <span>${index + 1}. ${comment}</span><br>
                  <span class="comment-sentiment">Sentiment: ${predictions[index]}</span>
                </li>`).join('')}
            </ul>
          </div>`;
      }
    } else {
      outputDiv.innerHTML = "<p>This is not a valid YouTube URL.</p>";
    }
  });

  // Fetch top-level comments from the YouTube API
  async function fetchComments(videoId, apiKey) {
    let comments = [];
    let pageToken = "";
    try {
      while (comments.length <= 500) {
        const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&pageToken=${pageToken}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.items) {
          data.items.forEach(item =>
            comments.push(item.snippet.topLevelComment.snippet.textOriginal)
          );
        }

        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
    return comments;
  }

  // Send comments to FastAPI for sentiment prediction
  async function getSentimentPredictions(comments, apiUrl) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comments })
      });
      const result = await response.json();
      return result.map(item => item.sentiment);
    } catch (error) {
      console.error("Error fetching predictions:", error);
      outputDiv.innerHTML += "<p>Error fetching sentiment predictions.</p>";
      return null;
    }
  }
});