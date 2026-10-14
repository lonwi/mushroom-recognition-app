const SaveFormat = { PNG: 'png', JPEG: 'jpeg', WEBP: 'webp' };

function context(width) {
  return {
    resize() {
      return context(width);
    },
    async renderAsync() {
      return {
        width,
        height: width,
        async saveAsync() {
          return { base64: '' };
        },
      };
    },
  };
}

const ImageManipulator = {
  manipulate() {
    return context(448);
  },
};

export { ImageManipulator, SaveFormat };
