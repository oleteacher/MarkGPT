export function getCaretCoordinates(
    element: HTMLTextAreaElement,
    position: number
): {
    left: number;
    top: number;
} {
    const div = document.createElement('div');
    const style = getComputedStyle(element);

    [
        'fontSize',
        'fontFamily',
        'lineHeight',
        'padding',
        'border',
        'wordWrap',
        'whiteSpace',
    ].forEach((prop) => {
        const computedValue = style.getPropertyValue(prop);
        div.style.setProperty(prop, computedValue);
    });

    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.width = element.offsetWidth + 'px';
    div.style.height = 'auto';

    const text = element.value.substring(0, position);
    div.textContent = text;

    document.body.appendChild(div);

    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);

    const coordinates = {
        left: span.offsetLeft,
        top: span.offsetTop,
    };

    document.body.removeChild(div);
    return coordinates;
}
