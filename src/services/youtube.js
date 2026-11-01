export function getEmbedUrl(videoId) {
  const params = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    modestbranding: '1',
    rel: '0',
  });

  // YouTube rejects embeds (Error 153 / "Video player configuration error")
  // when the request has no valid origin/referrer, which can happen on
  // dev tunnels and some desktop browsers.
  if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)) {
    params.set('origin', window.location.origin);
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function getWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getSearchUrl(exerciseName) {
  const query = encodeURIComponent(`how to do ${exerciseName || 'exercise'} proper form tutorial`);
  return `https://www.youtube.com/results?search_query=${query}`;
}

function getThumbnailAlternatives(videoId) {
  return [
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/0.jpg`,
  ];
}

export async function searchYoutubeTutorials(exerciseName) {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  const cleanExercise = String(exerciseName || 'exercise').trim();
  
  // Vary search query terms across calls to get fresh/different results from YouTube API
  const queryVariants = [
    `how to do ${cleanExercise} proper form tutorial`,
    `${cleanExercise} exercise technique and form`,
    `${cleanExercise} tutorial by expert coach`,
    `best form guide for ${cleanExercise}`,
    `${cleanExercise} common mistakes to avoid`
  ];
  const randomQuery = queryVariants[Math.floor(Math.random() * queryVariants.length)];
  const q = encodeURIComponent(randomQuery);

  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length >= 10) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=12&q=${q}&key=${apiKey}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          let items = data.items
            .filter((item) => item?.id?.videoId)
            .map((item) => {
              const videoId = item.id.videoId;
              const thumbs = getThumbnailAlternatives(videoId);
              const apiThumb =
                item.snippet?.thumbnails?.medium?.url ||
                item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.default?.url;

              if (apiThumb) {
                thumbs.unshift(apiThumb);
              }

              return {
                id: videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: thumbs[0],
                thumbnailAlternatives: thumbs,
                thumbnailIndex: 0,
                watchUrl: getWatchUrl(videoId),
                thumbnailError: false,
                playing: false,
              };
            });

          // Shuffle thoroughly and pick 4 diverse items so clicking "Find videos" gives fresh results
          items = items.sort(() => Math.random() - 0.5).slice(0, 4);
          if (items.length > 0) {
            return items;
          }
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // Fallback videos with shuffling (4 results)
  const pool = [
    { id: 'IODxDxX7oi4', title: `${cleanExercise} - Proper Form & Technique`, channel: 'Calisthenicmovement' },
    { id: '4Y2ZdHCOXok', title: `How To Do ${cleanExercise} (Step By Step)`, channel: 'Jeremy Ethier' },
    { id: 'rT7DgCr-3pg', title: `${cleanExercise} Form Guide & Setup`, channel: 'ScottHermanFitness' },
    { id: 'op9kVnSso6Q', title: `Mastering ${cleanExercise} Correctly`, channel: 'CrossFit' },
    { id: '1fbU_MkV7NE', title: `${cleanExercise} Checklist & Cues`, channel: 'LIVESTRONG' },
  ];

  return pool
    .sort(() => Math.random() - 0.5)
    .slice(0, 4)
    .map((item) => {
      const videoId = item.id;
      const thumbs = getThumbnailAlternatives(videoId);
      return {
        id: videoId,
        title: item.title,
        channel: item.channel,
        thumbnail: thumbs[0],
        thumbnailAlternatives: thumbs,
        thumbnailIndex: 0,
        watchUrl: getWatchUrl(videoId),
        thumbnailError: false,
        playing: false,
      };
    });
}
