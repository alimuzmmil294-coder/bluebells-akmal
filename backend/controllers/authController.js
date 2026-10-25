import User from '../models/User.js';
import Cart from '../models/Cart.js';

async function mergeSessionCart(sessionId, userId, newSessionId) {
  if (!sessionId) return;
  const guestCart = await Cart.findOne({ sessionId, user: null });
  if (!guestCart) return;

  const userCart = await Cart.findOne({ user: userId });
  if (!userCart) {
    guestCart.user = userId;
    guestCart.sessionId = newSessionId;
    await guestCart.save();
    return;
  }

  for (const guestItem of guestCart.items) {
    const existingItem = userCart.items.find((item) => item.cartItemId === guestItem.cartItemId);
    if (existingItem) {
      existingItem.quantity += guestItem.quantity;
    } else {
      userCart.items.push(guestItem.toObject());
    }
  }
  if (!userCart.couponCode) userCart.couponCode = guestCart.couponCode;
  await userCart.save();
  await guestCart.deleteOne();
}

export async function register(req, res, next) {
  try {
    const { name, email, password, phone, address, city } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.'
      });
    }

    // New registrations ALWAYS receive the 'user' role
    const newUser = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: 'user',
      status: 'active',
      phone: phone || '',
      address: address || '',
      city: city || ''
    });

    // Session regeneration prevents session fixation attacks
    const previousSessionId = req.sessionID;
    req.session.regenerate(async (err) => {
      if (err) return next(err);

      req.session.userId = newUser._id.toString();
      req.session.role = newUser.role;

      try {
        await mergeSessionCart(previousSessionId, newUser._id, req.sessionID);
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          res.status(201).json({
            success: true,
            message: 'Account successfully registered.',
            token: req.sessionID,
            user: newUser.toJSON()
          });
        });
      } catch (mergeErr) {
        next(mergeErr);
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +role +status');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Your account is suspended. Please contact customer support.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.'
      });
    }

    // Regenerate session ID upon successful login
    const previousSessionId = req.sessionID;
    req.session.regenerate(async (err) => {
      if (err) return next(err);

      req.session.userId = user._id.toString();
      req.session.role = user.role;

      try {
        await mergeSessionCart(previousSessionId, user._id, req.sessionID);

        // Update last login timestamp
        user.lastLoginAt = new Date();
        try {
          await user.save();
        } catch (saveErr) {
          console.error(`[Auth] Failed to update lastLoginAt for user ${user.email} (${user._id}):`, saveErr.message);
        }

        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          res.status(200).json({
            success: true,
            message: 'Signed in successfully.',
            token: req.sessionID,
            user: user.toJSON()
          });
        });
      } catch (mergeErr) {
        next(mergeErr);
      }
    });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res, next) {
  if (!req.session) {
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  }

  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('bluebells.sid');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  });
}

export async function getMe(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(200).json({
        success: true,
        user: null
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user || user.status === 'suspended') {
      req.session.destroy();
      return res.status(200).json({
        success: true,
        user: null
      });
    }

    res.status(200).json({
      success: true,
      token: req.sessionID,
      user: user.toJSON()
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name, phone, address, city, state, postalCode } = req.body;
    const user = await User.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (postalCode !== undefined) user.postalCode = postalCode;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: user.toJSON(),
      data: user.toJSON()
    });
  } catch (err) {
    next(err);
  }
}
