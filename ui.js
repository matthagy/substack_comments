/**
 * @typedef {Object} BodySpan
 * @property {string} type
 * @property {string} value
 */

/**
 * @typedef {Object} Comment
 * @property {number} post_id
 * @property {string} title
 * @property {string} canonical_url
 * @property {string} name
 * @property {number} user_id
 * @property {number} id
 * @property {boolean} top_level
 * @property {string} date
 * @property {number} likes
 * @property {number} timestamp
 * @property {BodySpan[][]} body
 * @property {number} total_children
 * @property {number} parent_id
 * @property {number} parent_children
 * @property {number} thread_id
 * @property {number} thread_children
 * @property {number} ratio_recv
 * @property {number} ratio_give
 * @property {number} grade_level
 * @property {number} word_count
 * @property {string} category
 * @property {string[]} tags
 */

/**
 * @typedef {Object} UIState
 * @property {string} selectCommentType
 * @property {string} sortBy
 * @property {string} showComments
 * @property {string} searchTerms
 * @property {string} category
 * @property {string[]} selectedTags
 * @property {string} startDate
 * @property {string} endDate
 * @property {number} pageNumber
 */

/**
 * @typedef {Object} UIElements
 * @property {HTMLElement} commentsDiv
 * @property {HTMLSelectElement} sortSelect
 * @property {HTMLSelectElement} typeSelect
 * @property {HTMLSelectElement} showSelect
 * @property {HTMLSelectElement} pageSelect
 * @property {HTMLElement} totalPages
 * @property {HTMLInputElement} startDateInput
 * @property {HTMLInputElement} endDateInput
 * @property {HTMLSelectElement} categorySelect
 * @property {HTMLInputElement} searchInput
 * @property {HTMLSelectElement} tagsSelect
 * @property {HTMLElement} commentCount
 * @property {HTMLButtonElement} resetButton
 * @property {HTMLButtonElement} copyUrlButton
 * @property {HTMLButtonElement} downloadJsonButton
 */

/**
 * @typedef {Object} ButtonHandler
 * @property {string} name
 * @property {HTMLButtonElement} button
 * @property {() => Promise<boolean>} handler
 * @property {string} originalText
 * @property {string} successText
 * @property {string} failureText
 * @property {string | undefined} runningText
 */

const loadComments = async () => {
    /** @type {Comment[] | string} */
    const commentsOrError = await fetch('./comments.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('Failed to fetch comments:', error);
            return error.message || 'Unknown error';
        });

    /** @type {UIElements} */
    const uiElements = (() => {
        /**
         * @param {string} id
         * @returns {HTMLElement}
         */
        const getElementById = (id) => {
            const element = document.getElementById(id);
            if (!element) throw new Error(`Element with id ${id} not found`);
            return element;
        }
        /**
         * @param {string} id
         * @returns {HTMLSelectElement}
         */
        const getSelectById = (id) => {
            const element = getElementById(id);
            if (!(element instanceof HTMLSelectElement)) throw new Error(`Element with id ${id} is not a select`);
            return element
        }
        /**
         * @param {string} id
         * @returns {HTMLInputElement}
         */
        const getInputById = (id) => {
            const element = getElementById(id);
            if (!(element instanceof HTMLInputElement)) throw new Error(`Element with id ${id} is not an input`);
            return element
        }
        /**
         * @param {string} id
         * @returns {HTMLButtonElement}
         */
        const getButtonById = (id) => {
            const element = getElementById(id);
            if (!(element instanceof HTMLButtonElement)) throw new Error(`Element with id ${id} is not a button`);
            return element
        }

        return {
            commentsDiv: getElementById('comments'),
            sortSelect: getSelectById('sort'),
            typeSelect: getSelectById('type'),
            showSelect: getSelectById('show'),
            pageSelect: getSelectById('page'),
            totalPages: getElementById('totalPages'),
            startDateInput: getInputById('startDate'),
            endDateInput: getInputById('endDate'),
            categorySelect: getSelectById('category'),
            searchInput: getInputById('search'),
            tagsSelect: getSelectById('tags'),
            commentCount: getElementById('commentCount'),
            resetButton: getButtonById('reset'),
            copyUrlButton: getButtonById('copyUrl'),
            downloadJsonButton: getButtonById('downloadJson')
        };
    })();

    if (typeof commentsOrError === 'string') {
        uiElements.commentsDiv.appendChild(document.createTextNode(`Failed to fetch comments: ${commentsOrError}`));
        return;
    }

    /** @type {Comment[]} */
    const allComments = commentsOrError;

    (() => { // Populate category dropdown
        /** @type {{ [tag: string]: number }} */
        const categoryCount = {};
        allComments.forEach(comment => {
            categoryCount[comment.category] = (categoryCount[comment.category] || 0) + 1;
        });

        const categories = Object.keys(categoryCount).sort((a, b) => a.localeCompare(b));
        categories.forEach(category => {
            const option = document.createElement('option');
            option.appendChild(document.createTextNode(`${category} (${categoryCount[category]})`));
            option.setAttribute('value', category);
            uiElements.categorySelect.add(option);
        });
    })();

    /** @type {{ [tag: string]: string }} */
    const tagColors = (() => { // Populate tags dropdown and generate tag colors
        /**
         * @param {number} n
         * @returns {string[]}
         */
        const generateHSVPalette = (n) => {
            const palette = [];
            for (let i = 0; i < n; i++) {
                const hue = (i / n) * 360; // Evenly spaced hues around the color wheel
                const saturation = 70; // Moderate saturation for vibrant yet soft colors
                const value = 50;
                const alpha = 0.3;
                palette.push(`hsla(${hue}, ${saturation}%, ${value}%, ${alpha})`);
            }
            return palette;
        };

        /** @type {{ [tag: string]: number }} */
        const tagsCount = {};
        allComments.forEach(comment => {
            comment.tags.forEach(tag => tagsCount[tag] = (tagsCount[tag] || 0) + 1);
        });
        const allTags = Object.keys(tagsCount);
        const topTags = allTags.sort((a, b) => tagsCount[b] - tagsCount[a]).slice(0, 20);
        const tagsColorArray = generateHSVPalette(topTags.length);

        allTags.filter(tag => tagsCount[tag] > 5)
            .sort((a, b) => a.localeCompare(b))
            .forEach(tag => {
                const option = document.createElement('option');
                option.appendChild(document.createTextNode(`${tag} (${tagsCount[tag]})`));
                option.setAttribute('value', tag);
                uiElements.tagsSelect.add(option);
            });
        return topTags.reduce((acc, tag, index) => {
            acc[tag] = tagsColorArray[index];
            return acc;
        }, {});
    })();

    (() => {
        const timestamps = allComments.map(comment => comment.timestamp);
        const secondsInDay = 24 * 60 * 60;
        uiElements.startDateInput.valueAsDate = new Date(Math.min(...timestamps) * 1000);
        uiElements.endDateInput.valueAsDate = new Date((Math.max(...timestamps) + secondsInDay) * 1000);
    })();

    /** @returns {UIState} */
    const getCurrentUIState = () => {
        return {
            selectCommentType: uiElements.typeSelect.value,
            sortBy: uiElements.sortSelect.value,
            showComments: uiElements.showSelect.value,
            searchTerms: uiElements.searchInput.value.trim(),
            category: uiElements.categorySelect.value,
            selectedTags: Array.from(uiElements.tagsSelect.selectedOptions).map(option => option.value),
            startDate: uiElements.startDateInput.value,
            endDate: uiElements.endDateInput.value,
            pageNumber: parseInt(uiElements.pageSelect.value, 10)
        };
    };

    const initialParams = getCurrentUIState();

    /** @type {UIState | null} */
    let lastState = null;

    let hasReadHashParams = false;

    const readParamsFromHash = () => {
        const hash = (window.location.hash || '').substring(1); // remove '#'
        const params = new URLSearchParams(hash);
        console.info('start readParamsFromHash', params);

        if (params.has('sort')) uiElements.sortSelect.value = params.get('sort');
        if (params.has('type')) uiElements.typeSelect.value = params.get('type');
        if (params.has('show')) uiElements.showSelect.value = params.get('show');
        if (params.has('page')) uiElements.pageSelect.value = params.get('page');
        if (params.has('startDate')) uiElements.startDateInput.value = params.get('startDate');
        if (params.has('endDate')) uiElements.endDateInput.value = params.get('endDate');
        if (params.has('category')) uiElements.categorySelect.value = params.get('category');
        if (params.has('search')) uiElements.searchInput.value = params.get('search');

        if (params.has('tags')) {
            const selectedTags = params.get('tags').split(',');
            for (let i = 0; i < uiElements.tagsSelect.options.length; i++) {
                uiElements.tagsSelect.options[i].selected = selectedTags.includes(uiElements.tagsSelect.options[i].value);
            }
        }
        hasReadHashParams = true;
    };

    const writeParamsToHash = () => {
        if (!hasReadHashParams) {
            throw new Error('writeParamsToHash without readParamsFromHash');
        }

        const params = new URLSearchParams();
        params.set('sort', uiElements.sortSelect.value);
        params.set('type', uiElements.typeSelect.value);
        params.set('show', uiElements.showSelect.value);
        params.set('page', uiElements.pageSelect.value);
        params.set('startDate', uiElements.startDateInput.value);
        params.set('endDate', uiElements.endDateInput.value);
        params.set('category', uiElements.categorySelect.value);
        params.set('search', uiElements.searchInput.value.trim());

        const selectedTags = Array.from(uiElements.tagsSelect.selectedOptions).map(o => o.value);
        if (selectedTags.length > 0) {
            params.set('tags', selectedTags.join(','));
        }

        window.location.hash = params.toString();
        console.info('finish writeParamsToHash', params);
    };

    /**
     * Parses search query to find individual terms, including those that are quoted.
     * @param {string} input
     * @returns string[]
     */
    const parseSearchTerms = (input) => {
        /* Matches two types of quoted terms:
         * 1. <...>
         * 2. "...", '...'
         */
        const quotedTermRegex = /<([^>]+)>|(["'])(?:(?!\2).)+\2/g;
        const quotedTerms = [];
        let match;
        let maxIterations = 1000;

        while ((match = quotedTermRegex.exec(input)) !== null) {
            if (!maxIterations--) {
                console.error('Max iterations hit, aborting parseSearchTerms.', input, match);
                break;
            }
            let matched = match[0];
            if (matched.length === 0) {
                console.warn('Empty match', match, 'exiting parseSearchTerms');
                break;
            }
            const quotedTerm = matched.startsWith('<') && matched.endsWith('>')
                ? match[1] : matched.slice(1, -1);
            quotedTerms.push(quotedTerm);
            input = input.replace(matched, ' ');
        }

        const remainingTerms = input.trim().split(/\s+/).filter(Boolean);
        return quotedTerms.concat(remainingTerms);
    };

    /**
     * Filters and then sorts using the passed-in UI state.
     * @param {Comment[]} comments
     * @param {UIState} state
     * @returns {Comment[]}
     */
    const getFilteredAndSortedComments = (comments, state) => {
        console.log('getFilteredAndSortedComments', comments.length, state);

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const doesTypeMatch = (comment) => {
            switch (state.selectCommentType) {
                case 'all':
                    return true;
                case 'top':
                    return comment.top_level;
                case 'reply':
                    return !comment.top_level;
            }
        }

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const doesCategoryMatch = (comment) => state.category === 'all' || comment.category === state.category

        const startTimestamp = state.startDate
            ? new Date(state.startDate).getTime() / 1000
            : null;
        const endTimestamp = state.endDate
            ? new Date(state.endDate).getTime() / 1000
            : null;

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const inTimestampRange = (comment) =>
            (startTimestamp === null || comment.timestamp >= startTimestamp) &&
            (endTimestamp === null || comment.timestamp <= endTimestamp)

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const doTagsMatch = (comment) => state.selectedTags.length === 0 || state.selectedTags[0] === 'all' ||
            state.selectedTags.every(tag => comment.tags.includes(tag));

        const searchTerms = parseSearchTerms(state.searchTerms);
        console.info('searchTerms', state.searchTerms, 'parsed to', searchTerms);
        const termsRegexes = searchTerms.map(term => {
            try {
                return new RegExp(term, 'i');
            } catch (e) {
                console.error(`Invalid regex: ${term}`, e);
                return null;
            }
        }).filter(Boolean);

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const doTermsMatch = (comment) => {
            if (termsRegexes.length === 0) {
                return true;
            }
            const domain = extractDomainComponents(comment['canonical_url']);
            return termsRegexes.every(termRegex =>
                comment.body.some(paragraph =>
                    paragraph.some(span => termRegex.test(span.value))
                ) || termRegex.test(comment.title) || termRegex.test(domain)
            );
        }

        /**
         * @param {Comment} comment
         * @returns {boolean}
         */
        const doesCommentMatch = (comment) => doesTypeMatch(comment) && doesCategoryMatch(comment) &&
            inTimestampRange(comment) && doTagsMatch(comment) && doTermsMatch(comment);

        /**
         * @param {Comment} comment
         * @returns {number}
         */
        const computeLength = (comment) => {
            return comment['body'].reduce((acc, paragraph) => {
                return acc + paragraph.reduce((acc, span) => {
                    return acc + span['value'].length;
                }, 0);
            }, 0);
        };

        /**
         * @param {Comment} a
         * @param {Comment} b
         * @returns {number}
         */
        const compareComments = (a, b) => {
            switch (state.sortBy) {
                case 'likes':
                    return b.likes - a.likes;
                case 'new':
                    return b.timestamp - a.timestamp;
                case 'old':
                    return a.timestamp - b.timestamp;
                case 'ratio_recv':
                    return b.ratio_recv - a.ratio_recv;
                case 'ratio_give':
                    return b.ratio_give - a.ratio_give;
                case 'fk_asc':
                    return a.grade_level - b.grade_level;
                case 'fk_desc':
                    return b.grade_level - a.grade_level;
                case 'reply_count':
                    return b.total_children - a.total_children;
                case 'length':
                    return computeLength(b) - computeLength(a);
                default:
                    throw new Error(`Unknown sort type: ${state.sortBy}`);
            }
        }

        const filteredComments = comments.filter(doesCommentMatch);
        filteredComments.sort(compareComments);
        return filteredComments;
    };

    /**
     * @param {UIState | null} prevState
     * @param {UIState} currentState
     * @returns {boolean}
     */
    const didPagesChange = (prevState, currentState) => {
        if (!prevState) return true; // first time
        return (
            prevState.selectCommentType !== currentState.selectCommentType ||
            prevState.sortBy !== currentState.sortBy ||
            prevState.showComments !== currentState.showComments ||
            prevState.searchTerms !== currentState.searchTerms ||
            prevState.startDate !== currentState.startDate ||
            prevState.endDate !== currentState.endDate ||
            prevState.category !== currentState.category ||
            prevState.selectedTags.join(',') !== currentState.selectedTags.join(',')
        );
    };

    let updating = false;

    const update = () => {
        if (updating) {
            console.warn('recursive update');
            return;
        }
        console.log('start updating');
        updating = true;
        const startTime = new Date().getTime();

        const currentState = getCurrentUIState();

        const pagesChange = didPagesChange(lastState, currentState);
        const pageNumber = pagesChange ? 1 : currentState.pageNumber;

        lastState = Object.assign({}, currentState, {pageNumber});

        let comments = getFilteredAndSortedComments(allComments, lastState);

        clearChildren(uiElements.commentCount);
        uiElements.commentCount.appendChild(document.createTextNode(`${comments.length} matching comments out of ${allComments.length} total`));

        let pages = 1;
        if (lastState.showComments !== 'all') {
            const commentsToShow = parseInt(lastState.showComments, 10);
            pages = Math.ceil(comments.length / commentsToShow);
            const start = (pageNumber - 1) * commentsToShow;
            const end = pageNumber * commentsToShow;
            comments = comments.slice(start, end);
        }

        clearChildren(uiElements.totalPages);
        uiElements.totalPages.appendChild(document.createTextNode(`of ${pages}`));

        clearChildren(uiElements.pageSelect);
        for (let i = 1; i <= pages; i++) {
            const pageOption = document.createElement('option');
            pageOption.appendChild(document.createTextNode(String(i)));
            pageOption.setAttribute('value', String(i));
            uiElements.pageSelect.add(pageOption);
        }
        uiElements.pageSelect.selectedIndex = pageNumber - 1;

        clearChildren(uiElements.commentsDiv);

        const searchTerms = parseSearchTerms(lastState.searchTerms)
        /** @returns {RegExp|null} */
        const createTermMatcher = () => {
            try {
                return new RegExp(searchTerms.map(t => `(?:${t})`).join('|'), 'ig');
            } catch (e) {
                console.error('Invalid regex', e);
                return null;
            }
        };
        const termsMatcher = searchTerms.length > 0 ? createTermMatcher() : null;

        comments.forEach(comment => uiElements.commentsDiv.appendChild(renderComment(comment, termsMatcher)));

        writeParamsToHash();
        const endTime = new Date().getTime();
        console.log(`update took ${endTime - startTime}ms`);
        updating = false;
    };

    /**
     * @param {HTMLElement} node
     */
    const clearChildren = (node) => {
        while (node.firstChild) {
            node.removeChild(node.lastChild);
        }
    };

    /**
     * @param {string} url
     * @param {string | HTMLElement} text
     * @param {string} cssClass
     * @returns {HTMLAnchorElement}
     */
    const createLink = (url, text, cssClass) => {
        const link = document.createElement('a');
        if (cssClass) {
            link.classList.add(cssClass);
        }
        link.setAttribute('href', url);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        const textNode = text instanceof HTMLElement ? text : document.createTextNode(text);
        link.appendChild(textNode);
        return link;
    };

    /**
     * Extracts the last two components of a URL's hostname.
     * @param {string} url
     * @returns {string}
     */
    const extractDomainComponents = (url) => {
        try {
            const hostname = new URL(url).hostname;
            const urlParts = hostname.split('.');
            if (urlParts.length >= 2) {
                const lastTwoComponents = urlParts.slice(-2).join('.');
                if (lastTwoComponents === 'substack.com') {
                    return urlParts.slice(-3).join('.');
                }
                return lastTwoComponents;
            }
            return hostname; // Fallback to full hostname
        } catch (error) {
            console.error('Invalid URL:', url);
            return 'unknown'; // Fallback for completely invalid URLs
        }
    };

    /**
     * Renders a single comment to the commentsDiv.
     * @param {Comment} comment
     * @param {RegExp | null} termsMatcher
     * @returns {HTMLDivElement}
     */
    const renderComment = (comment, termsMatcher) => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('entry');

        const metaDiv = document.createElement('div');
        metaDiv.classList.add('metaContainer');
        entryDiv.appendChild(metaDiv);

        /**
         * @param {string} text
         * @param {string} cssClass
         * @param {boolean} highlight
         */
        const createText = (text, cssClass, highlight = false) => {
            if (typeof text !== 'string') {
                throw new Error(`Expected string, got ${typeof text} for ${text}`);
            }
            const textSpan = document.createElement('span');
            metaDiv.appendChild(textSpan);
            textSpan.classList.add(cssClass);
            if (highlight) {
                createHighlightedText(textSpan, text, termsMatcher);
            } else {
                textSpan.appendChild(document.createTextNode(text));
            }
        };

        const createCommentLink = (commentId, text) => {
            metaDiv.appendChild(createLink(`${comment['canonical_url']}/comment/${commentId}`, text, 'meta'));
        };

        createText(comment['name'], 'name');
        createText(`❤ ${comment['likes']}, ${comment['date']}, FK=${comment['grade_level']}`, 'meta');
        metaDiv.appendChild(createHighlightLink(comment['canonical_url'], comment['title'].trim(), termsMatcher, 'post-title'));
        const domain = extractDomainComponents(comment['canonical_url']);
        createText(`[${domain}]`, 'meta', true);
        createCommentLink(comment.id, `${comment['top_level'] ? 'top-level' : 'reply'} (${comment['total_children']})`);

        if (!comment['top_level']) {
            createCommentLink(comment['thread_id'], `thread (${comment['thread_children']})`);
            createCommentLink(comment['parent_id'], `parent (${comment['parent_children']})`);
        }

        const tagsDiv = document.createElement('span');
        tagsDiv.classList.add('tags');
        comment['tags'].sort((a, b) => a.localeCompare(b))
            .forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.classList.add('tag');
                const tagColor = tagColors[tag];
                if (tagColor) {
                    tagSpan.style.backgroundColor = tagColor;
                }
                tagSpan.appendChild(document.createTextNode(tag));
                tagsDiv.appendChild(tagSpan);
            });
        metaDiv.appendChild(tagsDiv);

        const categorySpan = document.createElement('span');
        categorySpan.classList.add('category');
        categorySpan.appendChild(document.createTextNode(`Category: ${comment['category']}`));
        metaDiv.appendChild(categorySpan);

        const commentDiv = document.createElement('div');
        commentDiv.classList.add('comment-outer');
        entryDiv.appendChild(commentDiv);
        comment['body'].forEach(paragraph => commentDiv.appendChild(renderParagraph(paragraph, termsMatcher)));

        return entryDiv;
    };

    /**
     * @param {string} url
     * @param {string} text
     * @param {RegExp | null} termsMatcher
     * @param {string} cssClass
     * @returns {HTMLAnchorElement}
     */
    const createHighlightLink = (url, text, termsMatcher, cssClass) => {
        const textNode = document.createElement('span');
        const link = createLink(url, textNode, cssClass);
        createHighlightedText(textNode, text, termsMatcher);
        return link;
    };

    /**
     * @param {BodySpan[]} paragraph
     * @param {RegExp | null} termsMatcher
     * @returns {HTMLParagraphElement}
     */
    const renderParagraph = (paragraph, termsMatcher) => {
        const para = document.createElement('p');
        para.classList.add('comment-text');
        paragraph.forEach(span => {
            switch (span.type) {
                case 'text':
                    createHighlightedText(para, span.value, termsMatcher);
                    break;
                case 'url':
                    para.appendChild(createHighlightLink(span.value, span.value, termsMatcher, 'link'));
            }
        });
        return para;
    };

    /**
     * @param {HTMLElement} parent
     * @param {string} value
     * @param {RegExp | null} termsMatcher
     */
    const createHighlightedText = (parent, value, termsMatcher) => {
        if (termsMatcher === null) {
            parent.appendChild(document.createTextNode(value));
            return;
        }
        let match;
        let cur = 0;
        let maxIterations = 1000;
        while ((match = termsMatcher.exec(value)) !== null) {
            if (!maxIterations--) {
                console.error('Max iterations hit, aborting createHighlightedText.', termsMatcher);
                break;
            }
            const start = match.index;
            const matchValue = match[0];
            if (matchValue.length === 0) {
                console.warn('Empty match', match, 'exiting createHighlightedText');
                break;
            }
            if (start > cur) {
                parent.appendChild(document.createTextNode(value.substring(cur, start)));
            }
            const span = document.createElement('span');
            span.classList.add('highlight');
            span.appendChild(document.createTextNode(matchValue));
            parent.appendChild(span);
            cur = start + matchValue.length;
        }
        const remaining = value.substring(cur);
        if (remaining.length > 0) {
            parent.appendChild(document.createTextNode(remaining));
        }
    };

    /** @type {{ [name: string]: number }} */
    const buttonHandlerTimeouts = {};

    /** @param {ButtonHandler} buttonHandler */
    const handleButton = (buttonHandler) => {
        const setButtonText = (text) => {
            clearChildren(buttonHandler.button);
            buttonHandler.button.appendChild(document.createTextNode(text));
        }
        const wrapper = async () => {
            console.info(`attempt ${buttonHandler.name}`);
            const existingTimeout = buttonHandlerTimeouts[buttonHandler.name];
            if (existingTimeout) {
                console.warn(`Clearing callback for ${buttonHandler.name}`);
                clearTimeout(existingTimeout);
                buttonHandlerTimeouts[buttonHandler.name] = undefined;
            }
            if (buttonHandler.runningText) {
                setButtonText(buttonHandler.runningText);
            }
            let success = false;
            try {
                success = await buttonHandler.handler();
            } catch (error) {
                console.error(`Failed to ${buttonHandler.name}:`, error);
            }
            setButtonText(success ? buttonHandler.successText : buttonHandler.failureText);
            buttonHandlerTimeouts[buttonHandler.name] = setTimeout(() => {
                setButtonText(buttonHandler.originalText);
            }, 2000);
        }
        wrapper().catch(error => console.error(`Failed to ${buttonHandler.name}:`, error))
    }

    const resetOriginalText = uiElements.resetButton.textContent;
    const reset = () => {
        handleButton({
            name: 'reset',
            button: uiElements.resetButton,
            handler: async () => {
                console.info('attempt reset');
                uiElements.sortSelect.value = initialParams.sortBy;
                uiElements.typeSelect.value = initialParams.selectCommentType;
                uiElements.showSelect.value = initialParams.showComments;
                uiElements.pageSelect.value = initialParams.pageNumber.toString();
                uiElements.startDateInput.value = initialParams.startDate;
                uiElements.endDateInput.value = initialParams.endDate;
                uiElements.categorySelect.value = initialParams.category;
                uiElements.searchInput.value = initialParams.searchTerms;

                for (let i = 0; i < uiElements.tagsSelect.options.length; i++) {
                    uiElements.tagsSelect.options[i].selected = initialParams.selectedTags.includes(uiElements.tagsSelect.options[i].value);
                }

                update();
                console.info('finish reset');
                return true;
            },
            originalText: resetOriginalText,
            successText: 'State reset!',
            failureText: 'Failed to reset',
            runningText: undefined
        });
    }

    const copyUrlOriginalText = uiElements.copyUrlButton.textContent;
    const copyUrl = () => {
        handleButton({
            name: 'copyUrl',
            button: uiElements.copyUrlButton,
            handler: () =>
                navigator.clipboard.writeText(window.location.href)
                    .then(() => true)
                    .catch(error => {
                        console.error('Failed to copy URL to clipboard:', error);
                        return false;
                    }),
            originalText: copyUrlOriginalText,
            successText: 'Copied!',
            failureText: 'Failed to copy',
            runningText: undefined
        });
    }

    const downloadJsonOriginalText = uiElements.downloadJsonButton.textContent;
    const downloadJson = () => {
        handleButton({
            name: 'downloadJson',
            button: uiElements.downloadJsonButton,
            handler: async () => {
                const comments = getFilteredAndSortedComments(allComments, lastState);
                const prettyJson = JSON.stringify(comments, null, 2);
                const blob = new Blob([prettyJson], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `comments-${new Date().toISOString()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                return true;
            },
            originalText: downloadJsonOriginalText,
            successText: 'Downloaded!',
            failureText: 'Failed to download',
            runningText: 'Downloading...'
        })
    }

    /** @type {number | null} */
    let pendingDebounce = null;
    const debounceUpdate = () => {
        if (pendingDebounce) window.clearTimeout(pendingDebounce);
        pendingDebounce = window.setTimeout(() => {
            pendingDebounce = null;
            update()
        }, 200);
    };

    [uiElements.sortSelect, uiElements.typeSelect, uiElements.showSelect, uiElements.pageSelect,
        uiElements.startDateInput, uiElements.endDateInput, uiElements.categorySelect, uiElements.tagsSelect
    ].forEach(select => select.addEventListener("change", update));
    uiElements.searchInput.addEventListener("input", debounceUpdate);
    uiElements.resetButton.addEventListener('click', reset);
    uiElements.copyUrlButton.addEventListener('click', copyUrl);
    uiElements.downloadJsonButton.addEventListener('click', downloadJson);

    readParamsFromHash();
    update();
    console.log('finished loadComments')
};

window.addEventListener('DOMContentLoaded', loadComments);