import { useState, useEffect } from 'react';
import { Box, Image, Flex, Text, Heading } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

const BANNER_IMAGES = [
  'C:\\Users\\blackdot\\Downloads\\Gemini_Generated_Image_bs6wo1bs6wo1bs6w (2).jfif',
  'C:\\Users\\blackdot\\Downloads\\Gemini_Generated_Image_umayobumayobumay (2).jfif',
  'C:\\Users\\blackdot\\Downloads\\Gemini_Generated_Image_vnjfkwvnjfkwvnjf.jfif',
  'C:\\Users\\blackdot\\Downloads\\Gemini_Generated_Image_bs6wo1bs6wo1bs6w.jfif',
];

export function AnimatedBanner() {
  const { t } = useTranslation();
  const [currentImage, setCurrentImage] = useState(0);
  const [textPosition, setTextPosition] = useState(0);

  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % BANNER_IMAGES.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(imageInterval);
  }, []);

  useEffect(() => {
    const textInterval = setInterval(() => {
      setTextPosition((prev) => (prev + 1) % 100);
    }, 50); // Smooth text movement

    return () => clearInterval(textInterval);
  }, []);

  return (
    <Box
      position="relative"
      width="100%"
      height={{ base: '200px', md: '300px', lg: '400px' }}
      overflow="hidden"
      bg="gray.900"
    >
      {/* Animated Background Images */}
      {BANNER_IMAGES.map((img, idx) => (
        <Box
          key={idx}
          position="absolute"
          inset={0}
          opacity={currentImage === idx ? 1 : 0}
          transition="opacity 1s ease-in-out"
        >
          <Image
            src={img}
            alt={`Banner ${idx + 1}`}
            width="100%"
            height="100%"
            objectFit="cover"
          />
          {/* Dark overlay for text readability */}
          <Box
            position="absolute"
            inset={0}
            bg="rgba(0, 0, 0, 0.5)"
          />
        </Box>
      ))}

      {/* Moving Text Overlay */}
      <Flex
        position="absolute"
        inset={0}
        align="center"
        justify="center"
        overflow="hidden"
        zIndex={10}
      >
        <Box
          display="flex"
          gap={8}
          animation={`scroll 30s linear infinite`}
          sx={{
            '@keyframes scroll': {
              '0%': { transform: 'translateX(100%)' },
              '100%': { transform: 'translateX(-100%)' },
            },
          }}
        >
          {/* Repeated text for seamless loop */}
          {[0, 1, 2].map((i) => (
            <Heading
              key={i}
              size="lg"
              color="white"
              fontWeight="900"
              whiteSpace="nowrap"
              textShadow="2px 2px 4px rgba(0,0,0,0.8)"
              fontSize={{ base: '18px', md: '32px', lg: '48px' }}
            >
              {t('hero.eyebrow')} • {t('hero.title1')} {t('hero.title2')} {t('hero.titleAccent')}
            </Heading>
          ))}
        </Box>
      </Flex>

      {/* Dot Indicators */}
      <Flex
        position="absolute"
        bottom={4}
        left="50%"
        transform="translateX(-50%)"
        gap={2}
        zIndex={20}
      >
        {BANNER_IMAGES.map((_, idx) => (
          <Box
            key={idx}
            width={2}
            height={2}
            borderRadius="full"
            bg={currentImage === idx ? 'white' : 'rgba(255,255,255,0.5)'}
            cursor="pointer"
            onClick={() => setCurrentImage(idx)}
            transition="all 0.3s"
          />
        ))}
      </Flex>
    </Box>
  );
}
