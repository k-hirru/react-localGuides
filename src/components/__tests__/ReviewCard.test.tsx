import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import ReviewCard from "../ReviewCard";
import { Review, Business } from "@/src/types";

// Mock dependencies
jest.mock("@/src/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { uid: "user123" },
  }),
}));

jest.mock("@/src/services/reviewService", () => ({
  reviewService: {
    hasUserVoted: jest.fn().mockResolvedValue(false),
    addHelpfulVote: jest.fn(),
    removeHelpfulVote: jest.fn(),
    updateReviewHelpfulCount: jest.fn(),
  },
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  __esModule: true,
  default: {
    alert: jest.fn((title, message, buttons) => {
      // Auto-confirm the deletion by calling the destructive button
      if (buttons && buttons[1]) {
        buttons[1].onPress();
      }
    }),
  },
}));

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    MoreVertical: ({ size, color }: any) => (
      <View testID="more-vertical" size={size} color={color} />
    ),
    Edit: ({ size, color }: any) => (
      <View testID="edit-icon" size={size} color={color} />
    ),
    Trash2: ({ size, color }: any) => (
      <View testID="trash-icon" size={size} color={color} />
    ),
    UserCircle: () => <View testID="user-circle" />,
    ThumbsUp: ({ size, color, fill }: any) => (
      <View testID="thumbs-up" size={size} color={color} fill={fill} />
    ),
    Image: () => <View testID="image-icon" />,
  };
});

jest.mock("../StarRating", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ rating, size }: any) => (
    <View testID="star-rating" rating={rating} size={size} />
  );
});

const mockReview: Review = {
  id: "review1",
  businessId: "business1",
  userId: "user123",
  userName: "John Doe",
  userAvatar: "",
  rating: 4.5,
  text: "Great place with amazing food!",
  date: "2024-01-15",
  createdAt: new Date(),
  updatedAt: new Date(),
  helpful: 5,
};

const mockBusiness: Business = {
  id: "business1",
  name: "Test Restaurant",
  category: "restaurant",
  rating: 4.5,
  reviewCount: 42,
  priceLevel: 2,
  imageUrl: "https://example.com/image.jpg",
  address: "123 Test St",
  phone: "+1234567890",
  hours: {},
  coordinates: { latitude: 40.7128, longitude: -74.006 },
  photos: [],
  description: "Test description",
  features: [],
  placeId: "place1",
  source: "geoapify",
};

describe("ReviewCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders review information correctly", async () => {
    const { getByText, getByTestId } = render(
      <ReviewCard review={mockReview} business={mockBusiness} />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText("John Doe")).toBeTruthy();
    expect(getByText("Great place with amazing food!")).toBeTruthy();
    expect(getByText("2024-01-15")).toBeTruthy();
    expect(getByTestId("star-rating")).toBeTruthy();
  });

  it("shows menu for own review", async () => {
    const { getByTestId, getByText } = render(
      <ReviewCard
        review={mockReview}
        business={mockBusiness}
        isUsersReview={true}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.press(getByTestId("more-vertical"));
    });

    expect(getByText("Edit")).toBeTruthy();
    expect(getByText("Delete")).toBeTruthy();
  });

  it("hides menu for other users reviews", async () => {
    const otherUserReview = { ...mockReview, userId: "otherUser" };
    const { queryByTestId } = render(
      <ReviewCard review={otherUserReview} business={mockBusiness} />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(queryByTestId("more-vertical")).toBeNull();
  });

  it("calls onEdit when edit is pressed", async () => {
    const mockOnEdit = jest.fn();
    const { getByTestId } = render(
      <ReviewCard
        review={mockReview}
        business={mockBusiness}
        onEdit={mockOnEdit}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.press(getByTestId("more-vertical"));
    });

    await act(async () => {
      fireEvent.press(getByTestId("edit-menu-item"));
    });

    expect(mockOnEdit).toHaveBeenCalledWith(mockReview, mockBusiness);
  });

  it("calls onDelete when delete is pressed", async () => {
    const mockOnDelete = jest.fn();
    const { getByTestId } = render(
      <ReviewCard
        review={mockReview}
        business={mockBusiness}
        onDelete={mockOnDelete}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      fireEvent.press(getByTestId("more-vertical"));
    });

    await act(async () => {
      fireEvent.press(getByTestId("delete-menu-item"));
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockOnDelete).toHaveBeenCalledWith("review1");
  });

  it('shows "Your Review" badge for usersReview prop', async () => {
    const { getByText } = render(
      <ReviewCard
        review={mockReview}
        business={mockBusiness}
        isUsersReview={true}
      />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText("Your Review")).toBeTruthy();
  });

  it("handles helpful votes correctly", async () => {
    const mockReviewService =
      require("@/src/services/reviewService").reviewService;
    mockReviewService.addHelpfulVote.mockResolvedValue(undefined);
    mockReviewService.updateReviewHelpfulCount.mockResolvedValue(undefined);

    const otherUserReview = {
      ...mockReview,
      userId: "otherUser123",
      helpful: 5,
    };

    const { getByText } = render(
      <ReviewCard review={otherUserReview} business={mockBusiness} />
    );

    await act(async () => {
      await Promise.resolve();
    });

    const helpfulButton = getByText("Helpful (5)");

    await act(async () => {
      fireEvent.press(helpfulButton);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockReviewService.addHelpfulVote).toHaveBeenCalledWith({
      reviewId: "review1",
      reviewOwnerId: "otherUser123",
      taggedBy: "user123",
      businessId: "business1",
    });
  });

  it("shows images when available", async () => {
    const reviewWithImages = {
      ...mockReview,
      images: [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg",
      ],
    };

    const { getByText } = render(
      <ReviewCard review={reviewWithImages} business={mockBusiness} />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(getByText("Photos (2)")).toBeTruthy();
  });
});