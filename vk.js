const VKGame = {
  ready: false,
  clips: [],
  clipIndex: 0,

  async init() {
    try {
      if (window.vkBridge) {
        await vkBridge.send("VKWebAppInit");
        this.ready = true;
      }
    } catch (e) {
      this.ready = false;
    }
    await this.loadClips();
  },

  async loadClips() {
    const cfg = window.BIP_CONFIG;
    // Прямой video.get из браузера часто режется без токена.
    // 1) пробуем API  2) запасной список  3) плеер группы
    try {
      if (cfg.serviceToken) {
        const url = `https://api.vk.com/method/video.get?owner_id=${cfg.ownerId}&count=${cfg.clipsCount}&access_token=${cfg.serviceToken}&v=5.199`;
        const res = await fetch(url);
        const data = await res.json();
        const items = (data.response && data.response.items) || [];
        this.clips = items
          .filter(v => (v.duration || 0) <= cfg.maxClipSeconds)
          .slice(0, cfg.clipsCount)
          .map(v => ({ owner_id: v.owner_id, id: v.id, title: v.title }));
      }
    } catch (e) {}

    if (!this.clips.length) {
      this.clips = [{ owner_id: cfg.ownerId, id: 0, title: "Клипы Бипа", group: true }];
    }
  },

  currentClip() {
    const clip = this.clips[this.clipIndex % this.clips.length];
    this.clipIndex += 1;
    return clip;
  },

  embedUrl(clip) {
    if (!clip || !clip.id) {
      return `https://vk.ru/${window.BIP_CONFIG.groupScreenName}`;
    }
    return `https://vk.ru/video_ext.php?oid=${clip.owner_id}&id=${clip.id}&hd=2`;
  },

  openGroup() {
    const url = window.BIP_CONFIG.groupUrl;
    if (window.vkBridge && this.ready) {
      vkBridge.send("VKWebAppOpenURL", { url }).catch(() => window.open(url, "_blank"));
    } else {
      window.open(url, "_blank");
    }
  },

  async share(score, level) {
    const link = window.BIP_CONFIG.groupUrl;
    const message = `Бип набрал ${score} в игре «Бип дома». Уровень ${level}.`;
    try {
      if (window.vkBridge && this.ready) {
        await vkBridge.send("VKWebAppShare", { link });
        return;
      }
    } catch (e) {}
    window.open(link, "_blank");
  },

  async rewarded() {
    try {
      if (window.vkBridge && this.ready) {
        await vkBridge.send("VKWebAppShowNativeAds", { ad_format: "reward" });
        return true;
      }
    } catch (e) {}
    return false;
  },

  async buyLife() {
    try {
      if (window.vkBridge && this.ready) {
        await vkBridge.send("VKWebAppShowOrderBox", {
          type: "item",
          item: "extra_life"
        });
        return true;
      }
    } catch (e) {}
    return false;
  }
};
