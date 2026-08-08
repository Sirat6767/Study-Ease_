const { supabase } = require('../supabaseClient');

const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: No user found in request' });
      }
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', req.user.id)
        .single();
        
      if (error || !userData) {
        return res.status(401).json({ error: 'User role data not found' });
      }

      if (!userData.is_active) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }
      
      const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (!rolesArray.includes(userData.role)) {
        return res.status(403).json({ error: `Requires one of roles: ${rolesArray.join(', ')}` });
      }
      
      // Attach the fetched role to the request for convenience in controllers
      req.user.dbRole = userData.role;
      next();
    } catch (err) {
      console.error('Role verification error:', err);
      return res.status(500).json({ error: 'Internal server error during role verification' });
    }
  };
};

module.exports = requireRole;
