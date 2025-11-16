import React from 'react';

function elementIsVisible(element: HTMLElement, container: HTMLElement) {
    const elementBounds = element.getBoundingClientRect();
    const containerBounds = container.getBoundingClientRect();
    return elementBounds.top < containerBounds.bottom && elementBounds.bottom > containerBounds.top;
}

export const useVirtualizer = <T extends HTMLElement, U extends HTMLElement>(
    opts: {
        count: number;
        getScrollElement: () => T | null;
        estimateSize: (index: number) => number;
        overscan?: number;
    }
) => {
    const { count, getScrollElement, estimateSize, overscan = 0 } = opts;

    const [range, setRange] = React.useState<{startIndex: number; endIndex: number} | null>(null);

    const virtualItems = React.useMemo(() => {
        const virtualItems = [];
        const startIndex = range?.startIndex ?? 0;
        const endIndex = range?.endIndex ?? count -1;

        for (let i = startIndex; i <= endIndex; i++) {
            virtualItems.push({
                index: i,
                start: i * estimateSize(i),
                size: estimateSize(i),
            });
        }
        return virtualItems;
    }, [count, range, estimateSize]);

    const totalSize = React.useMemo(() => {
        let size = 0;
        for (let i = 0; i < count; i++) {
            size += estimateSize(i);
        }
        return size;
    }, [count, estimateSize]);

    React.useEffect(() => {
        const scrollElement = getScrollElement();
        if (!scrollElement) {
            return;
        }

        const onScroll = () => {
            const containerHeight = scrollElement.clientHeight;
            const scrollTop = scrollElement.scrollTop;
            
            let startIndex = 0;
            let totalHeight = 0;

            while (totalHeight < scrollTop && startIndex < count) {
                totalHeight += estimateSize(startIndex);
                startIndex++;
            }

            startIndex = Math.max(0, startIndex - 1 - overscan);

            let endIndex = startIndex;
            totalHeight = 0;
            while (totalHeight < containerHeight && endIndex < count) {
                totalHeight += estimateSize(endIndex);
                endIndex++;
            }
            endIndex = Math.min(count - 1, endIndex + overscan);

            setRange({startIndex, endIndex});
        };

        onScroll();

        scrollElement.addEventListener('scroll', onScroll);

        return () => {
            scrollElement.removeEventListener('scroll', onScroll);
        }
    }, [getScrollElement, count, estimateSize, overscan]);

    return {
        getVirtualItems: () => virtualItems,
        getTotalSize: () => totalSize,
    }
};