import { useNavigate } from 'react-router-dom';
import { Box, Flex, Heading, Text, Button, VStack } from '@chakra-ui/react';
import { ArrowLeft, MessageCircle } from 'lucide-react';

export default function MessagesPage() {
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
        bg="linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)"
        rounded="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        boxShadow="0 8px 24px rgba(6, 182, 212, 0.3)"
        animation="pulse 2s infinite"
      >
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>
        <MessageCircle size={40} color="white" />
      </Box>

      {/* Content */}
      <VStack spacing={3} align="center" textAlign="center" maxW="500px">
        <Heading size="lg" color="gray.900" fontWeight="800">
          Messages - Under Development
        </Heading>
        <Text fontSize="md" color="gray.600" lineHeight={1.6}>
          Direct messaging between buyers and sellers is coming soon. Connect directly with suppliers to discuss pricing, availability, and special requests.
        </Text>
        <Text fontSize="sm" color="gray.400">
          This feature will allow you to have real-time conversations with all your suppliers in one place.
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
