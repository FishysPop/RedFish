const hifiApiConfig = require("./hifiApiConfig");
const { fetchWithCORS, selectApiTarget, API_CONFIG } = hifiApiConfig;

async function getTracks({
  countryCode = "US",
  isrc = null,
  query = null,
  useBenchmark = false,
}) {
  if (!query && isrc) {
    query = isrc;
  }

  if (!query) {
    return [];
  }

  try {
    let target = selectApiTarget();

    let searchParams = `s=${encodeURIComponent(query)}&li=10`;
    const searchUrl = `${target.baseUrl}/search/?${searchParams}`;
    const response = await fetchWithCORS(searchUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 402 || response.status === 404) {
        console.warn(
          `[HifiApi] Search request failed with status ${response.status}, trying alternative endpoints...`
        );
        return await raceAlternativeEndpoints(query, countryCode);
      } else {
        throw new Error(
          `HIFI API search request failed with status ${response.status}`
        );
      }
    }

    const data = await response.json();
    if (data && data.tracks && data.tracks.items) {
      return data.tracks.items;
    } else if (data && data.items) {
      return data.items;
    } else if (Array.isArray(data)) {
      if (data.length > 0 && data[0].id && data[0].title) {
        return data;
      } else {
        for (const item of data) {
          if (
            item.tracks &&
            item.tracks.items &&
            Array.isArray(item.tracks.items)
          ) {
            return item.tracks.items;
          } else if (item.items && Array.isArray(item.items)) {
            return item.items;
          } else if (item.id && item.title) {
            return [item];
          }
        }
      }
      return [];
    } else if (data && typeof data === "object") {
      for (const key in data) {
        if (Array.isArray(data[key])) {
          return data[key];
        }
      }
    }
    return [];
  } catch (error) {
    console.error("[HifiApi] Error searching tracks:", error.message);
    return [];
  }
}

async function getOriginalTrackUrl({
  id,
  quality = "LOW",
  useBenchmark = true,
}) {
  try {
    let target = selectApiTarget();
    const trackUrl = `${target.baseUrl}/track/?id=${id}&quality=${quality}`;
    const response = await fetchWithCORS(trackUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 402 || response.status === 404) {
        console.warn(
          `[HifiApi] Track URL request failed with status ${response.status} for id ${id}, trying alternative endpoints...`
        );
        return await raceAlternativeTrackUrlEndpoint(id, quality);
      } else {
        throw new Error(
          `HIFI API track URL request failed with status ${response.status}`
        );
      }
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.OriginalTrackUrl) {
          return { url: item.OriginalTrackUrl };
        }
      }
      for (const item of data) {
        if (item.manifest && item.trackId) {
          try {
            const manifest = JSON.parse(
              Buffer.from(item.manifest, "base64").toString()
            );
            if (manifest.urls && manifest.urls.length > 0) {
              console.debug("[HifiApi] Found manifest URL:", manifest.urls[0]);
              return { url: manifest.urls[0] };
            }
          } catch (e) {
            console.warn("[HifiApi] Error parsing manifest:", e.message);
          }
        }
      }
      // If still no URL found, look for any URL field in the objects
      for (const item of data) {
        if (
          item.url &&
          typeof item.url === "string" &&
          item.url.includes("audio.tidal.com")
        ) {
          console.debug("[HifiApi] Found audio URL:", item.url);
          return { url: item.url };
        }
      }
      // If we can't find a direct URL, return the first object with track info to be processed elsewhere
      for (const item of data) {
        if (item.trackId) {
          console.debug("[HifiApi] Found trackId without URL, returning item:", item);
          return item;
        }
      }
      return null;
    } else if (data.url) {
      return { url: data.url };
    } else if (data.manifest) {
      try {
        const manifest = JSON.parse(
          Buffer.from(data.manifest, "base64").toString()
        );
        return { url: manifest.urls[0] };
      } catch (e) {
        console.warn("[HifiApi] Error parsing manifest:", e.message);
        return null;
      }
    } else if (data.trackId) {
      console.warn(
        "[HifiApi] Got track info but no direct URL, this may require additional processing:",
        data
      );
      for (const key in data) {
        if (
          key.toLowerCase().includes("url") &&
          typeof data[key] === "string"
        ) {
          return { url: data[key] };
        }
      }
      return null;
    } else {
      console.warn("[HifiApi] Unexpected response format for track URL:", data);
      for (const key in data) {
        if (
          key.toLowerCase().includes("url") &&
          typeof data[key] === "string"
        ) {
          return { url: data[key] };
        }
      }
      return null;
    }
  } catch (error) {
    console.error(
      `[HifiApi] Error getting track URL for id ${id}:`,
      error.message
    );
    return null;
  }
}

async function raceAlternativeEndpoints(query, countryCode) {
  const { selectApiTarget, fetchWithCORS } = hifiApiConfig;

  const currentTarget = selectApiTarget();

  const endpointPromises = [];
  const maxEndpoints = Math.min(5, API_CONFIG.targets.length); 
  let endpointCount = 0;

  for (const target of API_CONFIG.targets) {
    if (target.name === currentTarget.name) {
      continue;
    }

    if (endpointCount >= maxEndpoints) {
      break;
    }
    endpointCount++;

    endpointPromises.push(
      new Promise(async (resolve) => {
        try {
          let searchParams = `s=${encodeURIComponent(query)}&li=10`;
          if (query.includes(" - ")) {
            const parts = query.split(" - ");
            if (parts.length >= 2) {
              const artist = parts[0].trim();
              const track = parts.slice(1).join(" - ").trim();
              searchParams = `a=${encodeURIComponent(
                artist
              )}&s=${encodeURIComponent(track)}&li=10`;
            }
          }

          const searchUrl = `${target.baseUrl}/search/?${searchParams}`;
          const response = await fetchWithCORS(searchUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.tracks && data.tracks.items) {
              resolve(data.tracks.items);
            } else if (data && data.items) {
              resolve(data.items);
            } else if (Array.isArray(data)) {
              resolve(data);
            } else if (data && typeof data === "object") {
              for (const key in data) {
                if (Array.isArray(data[key])) {
                  resolve(data[key]);
                  return;
                }
              }
            }
            resolve([]);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.warn(
            `[HifiApi] Error in race for endpoint ${target.name}:`,
            error.message
          );
          resolve(null);
        }
      })
    );
  }

  if (endpointPromises.length === 0) {
    console.warn("[HifiApi] No alternative endpoints available for race");
    return [];
  }

  try {
    const results = await Promise.all(endpointPromises);
    for (const result of results) {
      if (result !== null && result.length > 0) {
        return result;
      }
    }
    console.warn("[HifiApi] All alternative endpoints in race failed");
    return [];
  } catch (error) {
    console.error(
      "[HifiApi] Error in raceAlternativeEndpoints:",
      error.message
    );
    return [];
  }
}

async function raceAlternativeTrackUrlEndpoint(id, quality) {
  const { selectApiTarget, fetchWithCORS } = hifiApiConfig;

  const currentTarget = selectApiTarget();

  const endpointPromises = [];
  const maxEndpoints = Math.min(5, API_CONFIG.targets.length); 
  let endpointCount = 0;

  for (const target of API_CONFIG.targets) {
    if (target.name === currentTarget.name) {
      continue;
    }

    if (endpointCount >= maxEndpoints) {
      break;
    }
    endpointCount++;

    endpointPromises.push(
      new Promise(async (resolve) => {
        try {
          const trackUrl = `${target.baseUrl}/track/?id=${id}&quality=${quality}`;
          const response = await fetchWithCORS(trackUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.url) {
              resolve({ url: data.url });
            } else if (data.manifest) {
              const manifest = JSON.parse(
                Buffer.from(data.manifest, "base64").toString()
              );
              resolve({ url: manifest.urls[0] });
            } else if (data.trackId) {
              console.warn(
                "[HifiApi] Got track info but no direct URL, this may require additional processing:",
                data
              );
              for (const key in data) {
                if (
                  key.toLowerCase().includes("url") &&
                  typeof data[key] === "string"
                ) {
                  resolve({ url: data[key] });
                  return;
                }
              }
              resolve(null);
            } else {
              console.warn(
                "[HifiApi] Unexpected response format for track URL:",
                data
              );
              for (const key in data) {
                if (
                  key.toLowerCase().includes("url") &&
                  typeof data[key] === "string"
                ) {
                  resolve({ url: data[key] });
                  return;
                }
              }
              resolve(null);
            }
          } else {
            resolve(null);
          }
        } catch (error) {
          console.warn(
            `[HifiApi] Error in race for track URL endpoint ${target.name}:`,
            error.message
          );
          resolve(null);
        }
      })
    );
  }

  if (endpointPromises.length === 0) {
    console.warn(
      "[HifiApi] No alternative track URL endpoints available for race"
    );
    return null;
  }

  try {
    const results = await Promise.all(endpointPromises);
    for (const result of results) {
      if (result !== null) {
        return result;
      }
    }
    console.warn(
      "[HifiApi] All alternative track URL endpoints in race failed"
    );
    return null;
  } catch (error) {
    console.error(
      "[HifiApi] Error in raceAlternativeTrackUrlEndpoint:",
      error.message
    );
    return null;
  }
}

async function getCover({ id = null, query = null, size = "640" }) {
  if (!id && !query) {
    return null;
  }

  try {
    let target = selectApiTarget();
    let coverUrl;
    if (id) {
      coverUrl = `${target.baseUrl}/cover/?id=${id}`;
    } else {
      coverUrl = `${target.baseUrl}/cover/?q=${encodeURIComponent(query)}`;
    }

    const response = await fetchWithCORS(coverUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(
        `[HifiApi] Cover request failed with status ${response.status}`
      );
      return null;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const coverData = data[0];
      return (
        coverData[size] ||
        coverData["640"] ||
        coverData["1280"] ||
        coverData["80"]
      );
    } else if (data && typeof data === "object") {
      return data[size] || data["640"] || data["1280"] || data["80"];
    }

    return null;
  } catch (error) {
    console.error("[HifiApi] Error getting cover:", error.message);
    return null;
  }
}

module.exports = {
  getTracks,
  getOriginalTrackUrl,
  getCover,
  raceAlternativeEndpoints,
  raceAlternativeTrackUrlEndpoint,
};
