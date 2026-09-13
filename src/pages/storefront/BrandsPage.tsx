import { useNavigate } from 'react-router-dom';
import { Box, Flex, Heading, Text, Button, VStack } from '@chakra-ui/react';
import { ArrowLeft, Zap } from 'lucide-react';

export default function BrandsPage() {
  const navigate = useNavigate();

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      minH="70vh"
      gap={6}
      px={4}
    >
      {/* Icon */}
      <Box
        w={20}
        h={20}
        bg="linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)"
        rounded="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        boxShadow="0 8px 24px rgba(124, 58, 237, 0.3)"
        animation="pulse 2s infinite"
      >
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
        <Zap size={40} color="white" />
      </Box>

      {/* Content */}
      <VStack spacing={3} align="center" textAlign="center" maxW="500px">
        <Heading size="lg" color="gray.900" fontWeight="800">
          Under Development
        </Heading>
        <Text fontSize="md" color="gray.600" lineHeight={1.6}>
          The Brands Page is currently under development. We're working hard to bring you an amazing experience to explore all our premium brands.
        </Text>
        <Text fontSize="sm" color="gray.400">
          Stay tuned! This feature will be available soon.
        </Text>
      </VStack>

      {/* Back Button */}
      <Button
        leftIcon={<ArrowLeft size={16} />}
        onClick={() => navigate('/')}
        bg="blue.600"
        color="white"
        fontWeight="600"
        rounded="lg"
        px={6}
        _hover={{ bg: 'blue.700', transform: 'translateY(-2px)' }}
        boxShadow="0 4px 12px rgba(37, 99, 235, 0.3)"
        transition="all 0.2s"
      >
        Back to Home
      </Button>
    </Flex>
  );
}
