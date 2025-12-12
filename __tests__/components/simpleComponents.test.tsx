import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { FormContainer } from '@/src/components/FormContainer';
import { StyledInput } from '@/src/components/StyledInput';
import { SocialButton } from '@/src/components/SocialButton';
import FindingPlacesLoader from '@/src/components/findingPlacesLoader';

const DummyIcon = () => <Text testID="dummy-icon">Icon</Text>;

describe('FormContainer', () => {
  it('renders children inside a styled container', () => {
    const { getByText } = render(
      <FormContainer>
        <Text>Inner Content</Text>
      </FormContainer>,
    );

    expect(getByText('Inner Content')).toBeTruthy();
  });
});

describe('StyledInput', () => {
  it('renders placeholder and value, and calls onChangeText', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <StyledInput
        Icon={DummyIcon}
        placeholder="Email"
        value="test@example.com"
        onChangeText={onChangeText}
      />,
    );

    const input = getByPlaceholderText('Email');
    expect(input.props.value).toBe('test@example.com');

    fireEvent.changeText(input, 'changed@example.com');
    expect(onChangeText).toHaveBeenCalledWith('changed@example.com');
  });
});

describe('SocialButton', () => {
  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SocialButton Icon={DummyIcon} text="Continue with Test" onPress={onPress} />,
    );

    const button = getByText('Continue with Test');
    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('FindingPlacesLoader', () => {
  it('renders loading text and icon container', () => {
    const { getByText, getByText: getByTextAgain } = render(<FindingPlacesLoader />);

    expect(getByText('Finding nearby places…')).toBeTruthy();
    // Ensure some child (icon container) is present
    expect(getByTextAgain('Finding nearby places…')).toBeTruthy();
  });
});
