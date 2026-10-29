(() => {
  const dataUrl = 'data/busan-attractions.json';
  const likesStorageKey = 'baseArchiveBusanTourismLikes';
  const visibleStep = 12;

  const list = document.querySelector('[data-tourism-list]');
  if (!list) return;

  const toolbar = document.querySelector('[data-tourism-toolbar]');
  const searchInput = document.querySelector('[data-tourism-search]');
  const districtSelect = document.querySelector('[data-tourism-district]');
  const count = document.querySelector('[data-tourism-count]');
  const feedback = document.querySelector('[data-tourism-feedback]');
  const updatedText = document.querySelector('[data-tourism-updated]');
  const moreWrap = document.querySelector('[data-tourism-more-wrap]');
  const moreButton = document.querySelector('[data-tourism-more]');

  let allItems = [];
  let visibleCount = visibleStep;
  let likedItems = new Set();

  const cleanDisplayText = (value) => String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
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

  const formatUpdatedDate = (value) => {
    if (!value) return '공개 데이터 기준';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return `${value} 기준`;
    return `${new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)} 기준`;
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
        getValue(item, ['ITEMCNTNTS', 'itemcntnts', 'itemContents']),
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
    const description = cleanDisplayText(getValue(
      item,
      ['ITEMCNTNTS', 'itemcntnts', 'itemContents'],
      [getValue(item, ['TITLE', 'title']), subtitle].filter(Boolean).join(' · ') || '상세 정보는 데이터 원문에서 확인할 수 있습니다.'
    ));
    const imageUrl = getValue(item, ['MAIN_IMG_THUMB', 'mainImgThumb', 'MAIN_IMG_NORMAL', 'mainImgNormal'])
      .replace(/^http:\/\//i, 'https://');
    const phone = cleanDisplayText(getValue(item, ['CNTCT_TEL', 'cntctTel']));
    const hours = cleanDisplayText(getValue(item, ['USAGE_DAY_WEEK_AND_TIME', 'usageDayWeekAndTime']));
    const holiday = cleanDisplayText(getValue(item, ['HLDY_INFO', 'hldyInfo']));
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
    } else {
      imageWrap.classList.add('is-placeholder');
      imageWrap.setAttribute('aria-hidden', 'true');
      imageWrap.textContent = 'BUSAN';
    }

    const descriptionWrap = document.createElement('div');
    descriptionWrap.className = 'tourism-item-description';
    const copy = document.createElement('p');
    copy.textContent = description;
    const meta = document.createElement('div');
    meta.className = 'tourism-item-meta';
    meta.textContent = [phone && `문의 ${phone}`, hours, holiday && `휴무 ${holiday}`].filter(Boolean).join(' · ') || '이용 정보 확인 필요';
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

    moreWrap.hidden = visibleCount >= filtered.length;
  };

  const loadData = async () => {
    setFeedback('부산 관광 명소 데이터를 불러오는 중입니다.', 'loading');

    try {
      const response = await fetch(dataUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`데이터 파일 응답 오류 (${response.status})`);
      const payload = await response.json();
      const items = Array.isArray(payload) ? payload : payload.items;
      if (!Array.isArray(items) || !items.length) throw new Error('표시할 관광 명소 데이터가 없습니다.');

      allItems = items;
      updatedText.textContent = formatUpdatedDate(payload.updatedAt);
      populateDistricts();
      toolbar.hidden = false;
      render();
    } catch (error) {
      toolbar.hidden = true;
      list.replaceChildren();
      moreWrap.hidden = true;
      updatedText.textContent = '데이터 연결 확인 필요';
      setFeedback(`${error.message} 잠시 후 다시 확인해 주세요.`, 'error');
    }
  };

  searchInput.addEventListener('input', () => {
    visibleCount = visibleStep;
    render();
  });

  districtSelect.addEventListener('change', () => {
    visibleCount = visibleStep;
    render();
  });

  moreButton.addEventListener('click', () => {
    visibleCount += visibleStep;
    render();
  });

  readLikedItems();
  loadData();
})();
