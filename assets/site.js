(() => {
  'use strict';
  let language = 'en';
  const languageToggle = document.querySelector('.language-toggle');
  const search = document.getElementById('paper-search');
  const year = document.getElementById('year-filter');
  const topic = document.getElementById('topic-filter');
  const rows = [...document.querySelectorAll('.publication-row')];
  const reset = document.querySelector('.reset-filters');
  const count = document.getElementById('paper-count');

  function filterPapers() {
    if (!search || !year || !topic) return;
    const query = search.value.trim().toLocaleLowerCase();
    let matches = 0;
    rows.forEach(row => {
      const visible = (year.value === 'all' || row.dataset.year === year.value)
        && (topic.value === 'all' || row.dataset.topic === topic.value)
        && row.dataset.search.toLocaleLowerCase().includes(query);
      row.hidden = !visible;
      if (visible) matches++;
    });
    count.textContent = language === 'zh' ? `${matches} 篇论文` : `${matches} publication${matches === 1 ? '' : 's'}`;
    document.getElementById('no-results').hidden = matches > 0;
    reset.hidden = !query && year.value === 'all' && topic.value === 'all';
  }

  function setLanguage(next, save = true) {
    language = next === 'zh' ? 'zh' : 'en';
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-en][data-zh]').forEach(element => {
      element.textContent = element.dataset[language].replace(/\\n/g, '\n');
    });
    document.querySelectorAll('[data-placeholder-en]').forEach(element => {
      element.placeholder = language === 'zh' ? element.dataset.placeholderZh : element.dataset.placeholderEn;
    });
    languageToggle.textContent = language === 'zh' ? 'EN' : '中文';
    languageToggle.setAttribute('aria-label', language === 'zh' ? 'Switch to English' : '切换至中文');
    if (save) {
      try { localStorage.setItem('ai4opt-language', language); } catch (_) { /* optional preference */ }
    }
    filterPapers();
  }

  languageToggle?.addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en'));
  try { setLanguage(localStorage.getItem('ai4opt-language') || 'en', false); }
  catch (_) { setLanguage('en', false); }

  [search, year, topic].filter(Boolean).forEach(element => element.addEventListener(element === search ? 'input' : 'change', filterPapers));
  reset?.addEventListener('click', () => {
    search.value = ''; year.value = 'all'; topic.value = 'all'; filterPapers();
  });

  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.getElementById('main-navigation');
  if (location.pathname.includes('/publications/')) {
    const archiveLink = navigation?.querySelector('.archive-nav');
    archiveLink?.classList.add('is-active');
    archiveLink?.setAttribute('aria-current', 'page');
  }
  function closeMenu() {
    navigation?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }
  menuButton?.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
  navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  const sections = [...document.querySelectorAll('main>.section-anchor')];
  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navigation.querySelectorAll('a').forEach(link => link.classList.toggle('is-active', link.hash === `#${entry.target.id}`));
      });
    }, { rootMargin: '-15% 0px -65% 0px' });
    sections.forEach(section => observer.observe(section));
  }

  let toastTimer;
  const copyButton = document.querySelector('.copy-citation');
  copyButton?.addEventListener('click', async () => {
    const citation = document.querySelector('.citation code');
    const toast = document.querySelector('.toast');
    try {
      await navigator.clipboard.writeText(citation.textContent);
      toast.textContent = language === 'zh' ? 'BibTeX 已复制' : 'BibTeX copied';
    } catch (_) {
      const range = document.createRange();
      range.selectNodeContents(citation);
      const selection = window.getSelection();
      selection.removeAllRanges(); selection.addRange(range);
      toast.textContent = language === 'zh' ? '已选中引用文本，请复制' : 'Citation selected. Copy the highlighted text.';
    }
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3000);
  });
})();
