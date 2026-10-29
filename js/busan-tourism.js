(() => {
  const endpoint = 'https://apis.data.go.kr/6260000/AttractionService/getAttractionKr';
  const localConfigUrl = 'js/busan-tourism-api.local.json';
  const storageKey = 'baseArchiveBusanTourismApiKey';
  const likesStorageKey = 'baseArchiveBusanTourismLikes';
  const pageSize = 100;
  const visibleStep = 12;

  const list = document.querySelector('[data-tourism-list]');
  if (!list) return;

  const accessPanel = document.querySelector('[data-api-access-panel]');
  const statusTitle = document.querySelector('[data-api-status-title]');
  const statusCopy = document.querySelector('[data-api-status-copy]');
  const keyToggle = document.querySelector('[data-api-key-toggle]');
  const keyClear = document.querySelector('[data-api-key-clear]');
  const keyForm = document.querySelector('[data-api-key-form]');
  const keyInput = document.querySelector('#busan-api-key');
  const toolbar = document.querySelector('[data-tourism-toolbar]');
  const searchInput = document.querySelector('[data-tourism-search]');
  const districtSelect = document.querySelector('[data-tourism-district]');
  const count = document.querySelector('[data-tourism-count]');
  const feedback = document.querySelector('[data-tourism-feedback]');
  const moreWrap = document.querySelector('[data-tourism-more-wrap]');
  const moreButton = document.querySelector('[data-tourism-more]');

  let serviceKey = '';
  let currentPage = 1;
  let totalCount = 0;
  let allItems = [];
  let visibleCount = visibleStep;
  let isLoading = false;
  let likedItems = new Set();

  const cleanDisplayText = (value) => String(value || '')
    .replace(/(?:\(|（)\s*(?:한|영|중간|중번|일)(?:\s*[,·/]\s*(?:한|영|중간|중번|일))*\s*(?:\)|）)/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const getValue = (item, keys, fallback = '') => {
    for (const key of keys) {
      const value = item?.[key];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return fallback;
  };

  const normalizeKey = (key) => {
    const trimmed = String(key || '').trim();
    if (!trimmed) return '';
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  };

  const readLikedItems = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(likesStorageKey) || '[]');
      likedItems = new Set(Array.isArray(saved) ? saved.map(String) : []);
    } catch {
      likedItems = new Set();
    }
  };

  const saveLikedItems = () => {
    try {
      localStorage.setItem(likesStorageKey, JSON.stringify([...likedItems]));
    } catch { /* ignore unavailable storage */ }
  };

  const readLocalConfig = async () => {
    try {
      const response = await fetch(localConfigUrl, { cache: 'no-store' });
      if (!response.ok) return '';
      const config = await response.json();
      return normalizeKey(config.serviceKey);
    } catch {
      return '';
    }
  };

  const setFeedback = (message, type = 'default') => {
    feedback.hidden = false;
    feedback.classList.toggle('is-loading', type === 'loading');
    const mark = feedback.querySelector('.tourism-feedback-mark');
    const copy = feedback.querySelector('p');
    mark.textContent = type === 'error' ? '!' : type === 'loading' ? '↻' : '↗';
    copy.textContent = message;
  };

  const hideFeedback = () => {
    feedback.hidden = true;
    feedback.classList.remove('is-loading');
  };

  const updateAccessState = (connected, source = 'browser') => {
    accessPanel.classList.toggle('is-connected', connected);
    keyClear.hidden = !connected || source === 'terminal';
    keyToggle.textContent = connected ? 'API 키 변경' : 'API 키 등록';
    statusTitle.textContent = connected ? '부산 명소 데이터 연결됨' : 'API 키를 등록해 주세요';
    statusCopy.textContent = connected
      ? source === 'terminal'
        ? '터미널의 로컬 설정으로 연결했습니다. 이 키는 GitHub에 업로드되지 않습니다.'
        : '이 브라우저에 저장한 키로 연결했습니다. 웹사이트 코드에는 키가 포함되지 않습니다.'
      : '키는 이 브라우저에만 저장되며 웹사이트 코드나 GitHub에는 포함되지 않습니다.';
  };

  const parseResponse = (payload) => {
    const apiRoot = payload?.getAttractionKr;
    const body = payload?.response?.body;
    const header = payload?.response?.header;
    const apiHeader = apiRoot?.header;
    const resultCode = header?.resultCode ?? apiHeader?.code;

    if (resultCode && resultCode !== '00' && resultCode !== '0000') {
      throw new Error(header?.resultMsg || apiHeader?.message || 'API 요청을 처리하지 못했습니다.');
    }

    const itemsValue = apiRoot?.item ?? body?.items?.item ?? body?.items ?? [];
    const items = Array.isArray(itemsValue) ? itemsValue : itemsValue ? [itemsValue] : [];
    const total = Number(apiRoot?.totalCount ?? body?.totalCount ?? items.length);
    return { items, total: Number.isFinite(total) ? total : items.length };
  };

  const loadPage = async (page = 1, append = false) => {
    if (!serviceKey || isLoading) return;
    isLoading = true;
    setFeedback('부산광역시 관광 명소 데이터를 불러오는 중입니다.', 'loading');
    moreButton.disabled = true;

    try {
      const url = new URL(endpoint);
      url.searchParams.set('ServiceKey', serviceKey);
      url.searchParams.set('pageNo', String(page));
      url.searchParams.set('numOfRows', String(pageSize));
      url.searchParams.set('resultType', 'json');

      const response = await fetch(url);
      if (!response.ok) throw new Error(`API 서버 응답 오류 (${response.status})`);
      const responseText = await response.text();
      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new Error('API 응답을 읽지 못했습니다.');
      }
      const result = parseResponse(payload);

      allItems = append ? [...allItems, ...result.items] : result.items;
      totalCount = result.total;
      currentPage = page;
      visibleCount = append ? visibleCount + visibleStep : visibleStep;

      populateDistricts();
      render();
      toolbar.hidden = false;
      hideFeedback();
    } catch (error) {
      toolbar.hidden = true;
      list.replaceChildren();
      moreWrap.hidden = true;
      setFeedback(`${error.message} 인증키가 유효한지, API 활용 신청이 완료됐는지 확인해 주세요.`, 'error');
      statusTitle.textContent = '데이터 연결을 확인해 주세요';
      statusCopy.textContent = '키를 다시 등록하거나 잠시 후 재시도할 수 있습니다.';
    } finally {
      isLoading = false;
      moreButton.disabled = false;
    }
  };

  const populateDistricts = () => {
    const selected = districtSelect.value;
    const districts = [...new Set(allItems
      .map((item) => cleanDisplayText(getValue(item, ['GUGUN_NM', 'gugunNm'])))
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'ko'));

    districtSelect.replaceChildren(new Option('부산 전체', ''));
    districts.forEach((district) => districtSelect.add(new Option(district, district)));
    districtSelect.value = districts.includes(selected) ? selected : '';
  };

  const getFilteredItems = () => {
    const query = searchInput.value.trim().toLocaleLowerCase('ko');
    const district = districtSelect.value;

    return allItems.filter((item) => {
      const itemDistrict = cleanDisplayText(getValue(item, ['GUGUN_NM', 'gugunNm']));
      if (district && itemDistrict !== district) return false;
      if (!query) return true;

      const searchable = cleanDisplayText([
        getValue(item, ['MAIN_TITLE', 'mainTitle']),
        getValue(item, ['TITLE', 'title']),
        getValue(item, ['SUBTITLE', 'subtitle']),
        getValue(item, ['PLACE', 'place']),
        getValue(item, ['ADDR1', 'addr1']),
        itemDistrict,
        getValue(item, ['MIDDLE_SIZE_RM1', 'middleSizeRm1'])
      ].join(' ')).toLocaleLowerCase('ko');

      return searchable.includes(query);
    });
  };

  const createItem = (item, index) => {
    const title = cleanDisplayText(getValue(item, ['MAIN_TITLE', 'mainTitle', 'TITLE', 'title'], '이름 없는 명소'));
    const subtitle = cleanDisplayText(getValue(item, ['SUBTITLE', 'subtitle', 'TITLE', 'title']));
    const district = cleanDisplayText(getValue(item, ['GUGUN_NM', 'gugunNm'], '부산'));
    const address = cleanDisplayText(getValue(item, ['ADDR1', 'addr1', 'MAIN_PLACE', 'mainPlace'], '주소 정보 없음'));
    const description = cleanDisplayText(getValue(item, ['MIDDLE_SIZE_RM1', 'middleSizeRm1'], subtitle || '상세 정보는 데이터 원문에서 확인할 수 있습니다.'));
    const imageUrl = getValue(item, ['MAIN_IMG_THUMB', 'mainImgThumb', 'MAIN_IMG_NORMAL', 'mainImgNormal'])
      .replace(/^http:\/\//i, 'https://');
    const phone = cleanDisplayText(getValue(item, ['CNTCT_TEL', 'cntctTel']));
    const hours = cleanDisplayText(getValue(item, ['USAGE_DAY_WEEK_AND_TIME', 'usageDayWeekAndTime']));
    const homepage = getValue(item, ['HOMEPAGE_URL', 'homepageUrl']);
    const itemId = getValue(item, ['UC_SEQ', 'ucSeq'], `${title}|${address}`);
    const isLiked = likedItems.has(itemId);

    const row = document.createElement('li');
    row.className = 'tourism-item';

    const number = document.createElement('span');
    number.className = 'tourism-item-index';
    number.textContent = `SPOT ${String(index + 1).padStart(2, '0')}`;

    const titleWrap = document.createElement('div');
    titleWrap.className = 'tourism-item-title';
    const districtLabel = document.createElement('span');
    districtLabel.className = 'tourism-item-district';
    districtLabel.textContent = district;
    const heading = document.createElement('h3');
    heading.textContent = title;
    const addressText = document.createElement('p');
    addressText.textContent = address;
    titleWrap.append(districtLabel, heading, addressText);

    const body = document.createElement('div');
    body.className = 'tourism-item-body';
    const imageWrap = document.createElement('div');
    imageWrap.className = 'tourism-item-image';
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = `${title} 전경`;
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('error', () => image.remove());
      imageWrap.append(image);
    }
    const descriptionWrap = document.createElement('div');
    descriptionWrap.className = 'tourism-item-description';
    const copy = document.createElement('p');
    copy.textContent = description;
    const meta = document.createElement('div');
    meta.className = 'tourism-item-meta';
    meta.textContent = [phone && `문의 ${phone}`, hours].filter(Boolean).join(' · ') || '이용 정보 확인 필요';
    descriptionWrap.append(copy, meta);
    body.append(imageWrap, descriptionWrap);

    const actions = document.createElement('div');
    actions.className = 'tourism-item-actions';

    const likeButton = document.createElement('button');
    likeButton.className = 'tourism-like-button';
    likeButton.type = 'button';
    likeButton.classList.toggle('is-liked', isLiked);
    likeButton.setAttribute('aria-pressed', String(isLiked));
    likeButton.setAttribute('aria-label', `${title} ${isLiked ? '좋아요 취소' : '좋아요'}`);
    const heart = document.createElement('span');
    heart.className = 'tourism-like-heart';
    heart.setAttribute('aria-hidden', 'true');
    heart.textContent = '♥';
    const likeLabel = document.createElement('span');
    likeLabel.textContent = '좋아요';
    likeButton.append(heart, likeLabel);
    likeButton.addEventListener('click', () => {
      const nextLiked = !likedItems.has(itemId);
      if (nextLiked) likedItems.add(itemId);
      else likedItems.delete(itemId);
      saveLikedItems();
      likeButton.classList.toggle('is-liked', nextLiked);
      likeButton.setAttribute('aria-pressed', String(nextLiked));
      likeButton.setAttribute('aria-label', `${title} ${nextLiked ? '좋아요 취소' : '좋아요'}`);
    });

    const link = document.createElement('a');
    link.className = 'tourism-item-link';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = homepage ? '공식 정보 보기 ↗' : '지도에서 보기 ↗';
    link.href = /^https?:\/\//i.test(homepage)
      ? homepage
      : `https://map.naver.com/p/search/${encodeURIComponent(`${title} ${address}`)}`;

    actions.append(likeButton, link);
    row.append(number, titleWrap, body, actions);
    return row;
  };

  const render = () => {
    const filtered = getFilteredItems();
    const itemsToShow = filtered.slice(0, visibleCount);
    list.replaceChildren(...itemsToShow.map(createItem));
    count.textContent = `${filtered.length.toLocaleString('ko-KR')}개 명소`;

    if (!filtered.length) {
      setFeedback('검색 조건에 맞는 명소가 없습니다. 다른 이름이나 지역으로 다시 찾아보세요.');
    } else {
      hideFeedback();
    }

    const hasHiddenFilteredItems = visibleCount < filtered.length;
    const hasMoreServerItems = allItems.length < totalCount;
    moreWrap.hidden = !hasHiddenFilteredItems && !hasMoreServerItems;
  };

  const saveBrowserKey = (key) => {
    try {
      localStorage.setItem(storageKey, key);
      return true;
    } catch {
      return false;
    }
  };

  keyToggle.addEventListener('click', () => {
    keyForm.hidden = !keyForm.hidden;
    if (!keyForm.hidden) keyInput.focus();
  });

  keyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const nextKey = normalizeKey(keyInput.value);
    if (!nextKey) return;
    serviceKey = nextKey;
    saveBrowserKey(nextKey);
    keyInput.value = '';
    keyForm.hidden = true;
    allItems = [];
    updateAccessState(true, 'browser');
    loadPage(1);
  });

  keyClear.addEventListener('click', () => {
    try { localStorage.removeItem(storageKey); } catch { /* ignore unavailable storage */ }
    serviceKey = '';
    allItems = [];
    list.replaceChildren();
    toolbar.hidden = true;
    moreWrap.hidden = true;
    updateAccessState(false);
    setFeedback('API 키를 등록하면 부산 전역의 관광 명소를 목록으로 확인할 수 있습니다.');
  });

  searchInput.addEventListener('input', () => {
    visibleCount = visibleStep;
    render();
  });
  districtSelect.addEventListener('change', () => {
    visibleCount = visibleStep;
    render();
  });

  moreButton.addEventListener('click', async () => {
    const filtered = getFilteredItems();
    if (visibleCount < filtered.length) {
      visibleCount += visibleStep;
      render();
      return;
    }

    if (allItems.length < totalCount) {
      await loadPage(currentPage + 1, true);
    }
  });

  const initialize = async () => {
    readLikedItems();
    let browserKey = '';
    try { browserKey = normalizeKey(localStorage.getItem(storageKey)); } catch { /* ignore unavailable storage */ }
    const terminalKey = await readLocalConfig();
    serviceKey = terminalKey || browserKey;

    if (!serviceKey) {
      updateAccessState(false);
      return;
    }

    updateAccessState(true, terminalKey ? 'terminal' : 'browser');
    loadPage(1);
  };

  initialize();
})();
