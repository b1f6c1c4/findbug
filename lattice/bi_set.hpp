#ifndef LATTICE_BI_SET_HPP
#define LATTICE_BI_SET_HPP

#include <unordered_set>
#include <list>
#include "homo_set.hpp"

class bi_set {
    homo_set<true> _us;
    homo_set<false> _ds;
    std::unordered_set<elem, elem::hasher> _ub, _lb;

public:
    class const_info {
        const bi_set &_bs;
        const elem &_el;
        const_info(const bi_set &bs, const elem &el);
    public:
        friend class bi_set;
        template <bool UD>
        bool is() const;
        bool is_true() const;
        bool is_false() const;
        bool is_decided() const;
        bool is_undecided() const;
    };

    class info {
        bi_set &_bs;
        const elem &_el;
        info(bi_set &bs, const elem &el);
    public:
        friend class bi_set;
        template <bool UD>
        bool is() const;
        bool is_true() const;
        bool is_false() const;
        bool is_decided() const;
        bool is_undecided() const;
        info &operator=(bool val);
    };

    const const_info operator[](const elem &el) const;
    info operator[](const elem &el);

    const homo_set<true> &get_us() const;
    const homo_set<false> &get_ds() const;
    const std::unordered_set<elem, elem::hasher> &get_ub() const;
    const std::unordered_set<elem, elem::hasher> &get_lb() const;
};

#endif //LATTICE_BI_SET_HPP
