import { useState, useEffect } from 'react';
import { Box } from '@chakra-ui/react';

const CAROUSEL_IMAGES = ['/hero-bg.jfif', '/image-2.jfif', '/image-3.jfif'];

export function ImageCarousel() {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      width="100%"
      height={{ base: '200px', md: '300px', lg: '400px' }}
      backgroundImage={`url('${CAROUSEL_IMAGES[currentImage]}')`}
      backgroundSize="cover"
      backgroundPosition="center"
      transition="background-image 0.5s ease-in-out"
    />
  );
}
